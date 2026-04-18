import { Injectable } from '@nestjs/common';
import { RecurrenceFrequency } from '../common/enums/recurrence-frequency.enum';
import {
  ParsedIcsCalendar,
  ParsedIcsEvent,
  ParsedIcsLocation,
  ParsedIcsRecurrenceRule,
} from './interfaces/parsed-ics.interface';

interface ParsedLine {
  name: string;
  params: Record<string, string>;
  value: string;
}

@Injectable()
export class IcsParserService {
  parse(content: string): ParsedIcsCalendar {
    const unfoldedLines = this.unfoldLines(content);
    const eventBlocks = this.extractEventBlocks(unfoldedLines);
    const calendarTimezone = this.extractCalendarTimezone(unfoldedLines);

    const events = eventBlocks
      .map((block) => this.parseEvent(block, calendarTimezone))
      .filter((event): event is ParsedIcsEvent => event !== null);

    return {
      timezone: calendarTimezone,
      events,
    };
  }

  private unfoldLines(content: string): string[] {
    const normalized = content.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
    const rawLines = normalized.split('\n');
    const unfolded: string[] = [];

    for (const line of rawLines) {
      if ((line.startsWith(' ') || line.startsWith('\t')) && unfolded.length > 0) {
        unfolded[unfolded.length - 1] += line.slice(1);
        continue;
      }

      unfolded.push(line);
    }

    return unfolded;
  }

  private extractEventBlocks(lines: string[]): string[][] {
    const blocks: string[][] = [];
    let currentBlock: string[] | null = null;

    for (const line of lines) {
      if (line === 'BEGIN:VEVENT') {
        currentBlock = [];
        continue;
      }

      if (line === 'END:VEVENT') {
        if (currentBlock) {
          blocks.push(currentBlock);
        }

        currentBlock = null;
        continue;
      }

      if (currentBlock) {
        currentBlock.push(line);
      }
    }

    return blocks;
  }

  private extractCalendarTimezone(lines: string[]): string {
    for (const line of lines) {
      if (line.startsWith('BEGIN:VEVENT')) {
        break;
      }

      if (line.startsWith('TZID:')) {
        return this.cleanText(line.slice('TZID:'.length)) || 'America/Bogota';
      }
    }

    return 'America/Bogota';
  }

  private parseEvent(
    eventLines: string[],
    calendarTimezone: string,
  ): ParsedIcsEvent | null {
    const properties = eventLines.map((line) => this.parseLine(line));
    const summary = this.getPropertyValue(properties, 'SUMMARY');
    const dtStart = this.getProperty(properties, 'DTSTART');
    const dtEnd = this.getProperty(properties, 'DTEND');

    if (!summary || !dtStart || !dtEnd) {
      return null;
    }

    const timezone =
      dtStart.params.TZID ??
      this.getPropertyValue(properties, 'TZID') ??
      calendarTimezone;

    const cleanSummary = this.cleanText(summary);
    if (!cleanSummary) {
      return null;
    }

    const description = this.cleanText(
      this.getPropertyValue(properties, 'DESCRIPTION'),
    );
    const location = this.parseLocation(
      this.cleanText(this.getPropertyValue(properties, 'LOCATION')),
    );

    const courseMetadata = this.extractCourseMetadata(cleanSummary);

    return {
      title: courseMetadata.title,
      fullSummary: cleanSummary,
      courseCode: courseMetadata.courseCode,
      section: courseMetadata.section,
      nrc: this.extractNrc(description),
      startsAt: this.parseDateValue(dtStart.value, timezone),
      endsAt: this.parseDateValue(dtEnd.value, timezone),
      timezone,
      uid: this.cleanText(this.getPropertyValue(properties, 'UID')),
      location,
      description,
      instructors: this.extractInstructors(description),
      recurrenceRule: this.parseRecurrenceRule(
        this.getPropertyValue(properties, 'RRULE'),
        timezone,
      ),
    };
  }

  private parseLine(line: string): ParsedLine {
    const separatorIndex = line.indexOf(':');

    if (separatorIndex === -1) {
      return {
        name: line,
        params: {},
        value: '',
      };
    }

    const rawKey = line.slice(0, separatorIndex);
    const value = line.slice(separatorIndex + 1);
    const [name, ...paramEntries] = rawKey.split(';');
    const params = paramEntries.reduce<Record<string, string>>((acc, entry) => {
      const [paramKey, paramValue] = entry.split('=');

      if (paramKey && paramValue) {
        acc[paramKey] = paramValue;
      }

      return acc;
    }, {});

    return {
      name,
      params,
      value,
    };
  }

  private getProperty(lines: ParsedLine[], propertyName: string): ParsedLine | undefined {
    return lines.find((line) => line.name === propertyName);
  }

  private getPropertyValue(
    lines: ParsedLine[],
    propertyName: string,
  ): string | undefined {
    return this.getProperty(lines, propertyName)?.value;
  }

  private parseRecurrenceRule(
    rawRule: string | undefined,
    timezone: string,
  ): ParsedIcsRecurrenceRule | undefined {
    if (!rawRule) {
      return undefined;
    }

    const parts = rawRule.split(';').reduce<Record<string, string>>((acc, entry) => {
      const [key, value] = entry.split('=');

      if (key && value) {
        acc[key] = value;
      }

      return acc;
    }, {});

    const rawFrequency = parts.FREQ?.toUpperCase();

    if (!rawFrequency) {
      return undefined;
    }

    const frequencyMap: Record<string, RecurrenceFrequency> = {
      DAILY: RecurrenceFrequency.DAILY,
      WEEKLY: RecurrenceFrequency.WEEKLY,
      MONTHLY: RecurrenceFrequency.MONTHLY,
    };

    const frequency = frequencyMap[rawFrequency];

    if (!frequency) {
      return undefined;
    }

    return {
      frequency,
      interval: parts.INTERVAL ? Number(parts.INTERVAL) || 1 : 1,
      byDay: parts.BYDAY ? parts.BYDAY.split(',').filter(Boolean) : [],
      timezone,
      untilDate: parts.UNTIL
        ? this.parseDateValue(parts.UNTIL, timezone)
        : undefined,
    };
  }

  private parseLocation(rawLocation?: string): ParsedIcsLocation | undefined {
    if (!rawLocation) {
      return undefined;
    }

    const campusMatch = rawLocation.match(/Campus:\s*(.+?)(?=\s+Edificio:|$)/i);
    const buildingMatch = rawLocation.match(
      /Edificio:\s*(.+?)(?=\s+Sal[oó]n:|$)/i,
    );
    const roomMatch = rawLocation.match(/Sal[oó]n:\s*([A-Za-z0-9_ -]+)/i);

    return {
      raw: rawLocation,
      campus: campusMatch?.[1]?.trim(),
      buildingName: buildingMatch?.[1]?.trim(),
      roomCode: roomMatch?.[1]?.trim(),
    };
  }

  private extractCourseMetadata(summary: string): {
    title: string;
    courseCode?: string;
    section?: string;
  } {
    const match = summary.match(
      /^(.*?)([A-Z]{3,}\s+\d{4}[A-Z]?)\s+([A-Z0-9]+)$/u,
    );

    if (!match) {
      return { title: summary };
    }

    return {
      title: match[1].trim(),
      courseCode: match[2].trim(),
      section: match[3].trim(),
    };
  }

  private extractNrc(description?: string): string | undefined {
    if (!description) {
      return undefined;
    }

    return description.match(/NRC:\s*(\d+)/i)?.[1];
  }

  private extractInstructors(description?: string): string[] {
    if (!description) {
      return [];
    }

    const instructorLine = description.match(/Instructor:\s*(.+?)(?:\n|$)/i)?.[1];

    if (!instructorLine) {
      return [];
    }

    const normalizedLine = instructorLine
      .replace(/\(([^)]+)\)/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();

    const matches =
      normalizedLine.match(
        /[A-Za-zÁÉÍÓÚÑÜáéíóúñü' -]+,\s*[A-Za-zÁÉÍÓÚÑÜáéíóúñü' -]+/gu,
      ) ?? [];

    return [...new Set(matches.map((name) => name.trim()).filter(Boolean))];
  }

  private parseDateValue(value: string, timezone: string): Date {
    if (value.endsWith('Z')) {
      return this.parseUtcDate(value);
    }

    const dateOnlyMatch = value.match(/^(\d{4})(\d{2})(\d{2})$/);

    if (dateOnlyMatch) {
      const [, year, month, day] = dateOnlyMatch;
      return this.zonedDateTimeToUtc(
        Number(year),
        Number(month),
        Number(day),
        0,
        0,
        0,
        timezone,
      );
    }

    const dateTimeMatch = value.match(
      /^(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})$/,
    );

    if (!dateTimeMatch) {
      return new Date(value);
    }

    const [, year, month, day, hour, minute, second] = dateTimeMatch;

    return this.zonedDateTimeToUtc(
      Number(year),
      Number(month),
      Number(day),
      Number(hour),
      Number(minute),
      Number(second),
      timezone,
    );
  }

  private parseUtcDate(value: string): Date {
    const utcMatch = value.match(
      /^(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})Z$/,
    );

    if (!utcMatch) {
      return new Date(value);
    }

    const [, year, month, day, hour, minute, second] = utcMatch;

    return new Date(
      Date.UTC(
        Number(year),
        Number(month) - 1,
        Number(day),
        Number(hour),
        Number(minute),
        Number(second),
      ),
    );
  }

  private zonedDateTimeToUtc(
    year: number,
    month: number,
    day: number,
    hour: number,
    minute: number,
    second: number,
    timezone: string,
  ): Date {
    const utcGuess = new Date(
      Date.UTC(year, month - 1, day, hour, minute, second),
    );
    const offset = this.getTimezoneOffsetMilliseconds(utcGuess, timezone);

    return new Date(utcGuess.getTime() - offset);
  }

  private getTimezoneOffsetMilliseconds(date: Date, timezone: string): number {
    const formatter = new Intl.DateTimeFormat('en-US', {
      timeZone: timezone,
      hour12: false,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });

    const parts = formatter.formatToParts(date).reduce<Record<string, string>>(
      (acc, part) => {
        if (part.type !== 'literal') {
          acc[part.type] = part.value;
        }

        return acc;
      },
      {},
    );

    const asUtc = Date.UTC(
      Number(parts.year),
      Number(parts.month) - 1,
      Number(parts.day),
      Number(parts.hour),
      Number(parts.minute),
      Number(parts.second),
    );

    return asUtc - date.getTime();
  }

  private cleanText(value?: string): string | undefined {
    if (!value) {
      return undefined;
    }

    let cleaned = value
      .replace(/\\\\/g, '\\')
      .replace(/\\n/g, '\n')
      .replace(/\\,/g, ',')
      .replace(/\\;/g, ';')
      .trim();

    cleaned = this.decodeHtmlEntities(cleaned);

    if (/[ÃÂâ]/.test(cleaned)) {
      cleaned = Buffer.from(cleaned, 'latin1').toString('utf8');
    }

    return cleaned.trim();
  }

  private decodeHtmlEntities(value: string): string {
    const entityMap: Record<string, string> = {
      '&Aacute;': 'Á',
      '&aacute;': 'á',
      '&Eacute;': 'É',
      '&eacute;': 'é',
      '&Iacute;': 'Í',
      '&iacute;': 'í',
      '&Oacute;': 'Ó',
      '&oacute;': 'ó',
      '&Uacute;': 'Ú',
      '&uacute;': 'ú',
      '&Ntilde;': 'Ñ',
      '&ntilde;': 'ñ',
      '&Uuml;': 'Ü',
      '&uuml;': 'ü',
      '&amp;': '&',
    };

    return value.replace(/&[A-Za-z]+;/g, (entity) => entityMap[entity] ?? entity);
  }
}
