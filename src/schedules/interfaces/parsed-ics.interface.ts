import { RecurrenceFrequency } from '../../common/enums/recurrence-frequency.enum';

export interface ParsedIcsRecurrenceRule {
  frequency: RecurrenceFrequency;
  interval: number;
  byDay: string[];
  timezone: string;
  untilDate?: Date;
}

export interface ParsedIcsLocation {
  raw: string;
  campus?: string;
  buildingName?: string;
  roomCode?: string;
}

export interface ParsedIcsEvent {
  title: string;
  fullSummary: string;
  courseCode?: string;
  section?: string;
  nrc?: string;
  startsAt: Date;
  endsAt: Date;
  timezone: string;
  uid?: string;
  location?: ParsedIcsLocation;
  description?: string;
  instructors: string[];
  recurrenceRule?: ParsedIcsRecurrenceRule;
}

export interface ParsedIcsCalendar {
  timezone: string;
  events: ParsedIcsEvent[];
}
