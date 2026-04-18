import { readFileSync } from 'fs';
import { join } from 'path';
import { IcsParserService } from './ics-parser.service';

describe('IcsParserService', () => {
  const parser = new IcsParserService();

  it('parses the sample Ellucian calendar file', () => {
    const samplePath = join(
      process.cwd(),
      'src',
      'utils',
      'SEGUNDO SEMESTRE 2026.ics',
    );
    const content = readFileSync(samplePath, 'utf8');

    const parsedCalendar = parser.parse(content);

    expect(parsedCalendar.timezone).toBe('America/Bogota');
    expect(parsedCalendar.events.length).toBeGreaterThan(0);
    expect(parsedCalendar.events[0]).toEqual(
      expect.objectContaining({
        title: expect.any(String),
        startsAt: expect.any(Date),
        endsAt: expect.any(Date),
        timezone: 'America/Bogota',
      }),
    );
  });
});
