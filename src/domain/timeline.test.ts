import { describe, expect, it } from 'vitest';
import {
  endTime,
  formatDuration,
  isValidTime,
  neighboursAfterMove,
  neighboursForTime,
  parseDuration,
  suggestStartTime,
  timeFromDb,
  toMinutes,
  validateEvent,
} from './timeline';

const at = (id: string, startTime: string, position: number) => ({ id, startTime, position });

describe('isValidTime / toMinutes / timeFromDb', () => {
  it('accepts HH:MM only', () => {
    expect(isValidTime('00:00')).toBe(true);
    expect(isValidTime('23:59')).toBe(true);
    for (const bad of ['', '24:00', '9:30', '12:60', '12:30:00', 'ab:cd']) expect(isValidTime(bad)).toBe(false);
  });
  it('counts minutes from midnight', () => {
    expect(toMinutes('00:00')).toBe(0);
    expect(toMinutes('14:30')).toBe(870);
  });
  it('drops the seconds of a database time', () => {
    expect(timeFromDb('14:30:00')).toBe('14:30');
    expect(timeFromDb('09:05')).toBe('09:05');
  });
});

describe('endTime', () => {
  it('adds the duration', () => expect(endTime('14:30', 90)).toBe('16:00'));
  it('wraps past midnight', () => expect(endTime('23:30', 60)).toBe('00:30'));
  it('has no end without a duration', () => expect(endTime('14:30', null)).toBeNull());
  it('has no end for a bad start', () => expect(endTime('nope', 30)).toBeNull());
});

describe('parseDuration / formatDuration', () => {
  it('reads whole minutes in range', () => {
    expect(parseDuration(' 45 ')).toBe(45);
    expect(parseDuration('1440')).toBe(1440);
  });
  it('rejects the rest as null', () => {
    for (const bad of ['', '0', '1441', '-5', '1.5', 'abc']) expect(parseDuration(bad)).toBeNull();
  });
  it('formats hours and minutes', () => {
    expect(formatDuration(45)).toBe('45 min');
    expect(formatDuration(120)).toBe('2 h');
    expect(formatDuration(90)).toBe('1 h 30 min');
  });
});

describe('validateEvent', () => {
  const ok = { title: 'Cununia', startTime: '15:00', duration: '30' };
  it('passes a complete event', () => expect(validateEvent(ok)).toEqual({}));
  it('allows an empty duration', () => expect(validateEvent({ ...ok, duration: '' })).toEqual({}));
  it('flags a blank title, a bad time and a bad duration', () => {
    expect(validateEvent({ title: '  ', startTime: '25:00', duration: '0' })).toEqual({
      title: true,
      startTime: true,
      duration: true,
    });
  });
});

describe('neighboursForTime', () => {
  const day = [at('a', '10:00', 0), at('b', '14:00', 10), at('c', '20:00', 20)];
  it('goes between the events around the time', () => expect(neighboursForTime(day, '12:00')).toEqual([0, 10]));
  it('goes first when earlier than all', () => expect(neighboursForTime(day, '08:00')).toEqual([null, 0]));
  it('goes last when later than all', () => expect(neighboursForTime(day, '22:00')).toEqual([20, null]));
  it('lands after an equal time', () => expect(neighboursForTime(day, '14:00')).toEqual([10, 20]));
  it('goes into an empty list', () => expect(neighboursForTime([], '12:00')).toEqual([null, null]));
  it('ignores positions order of input', () => {
    expect(neighboursForTime([day[2], day[0], day[1]], '12:00')).toEqual([0, 10]);
  });
  it('stops at an after-midnight event', () => {
    const late = [...day, at('d', '00:30', 30)];
    expect(neighboursForTime(late, '22:00')).toEqual([20, 30]);
    expect(neighboursForTime(late, '23:00')).toEqual([20, 30]);
  });
  it('can leave out the event being moved', () => {
    expect(neighboursForTime(day, '16:00', 'b')).toEqual([0, 20]);
  });
});

describe('neighboursAfterMove', () => {
  const day = [at('a', '10:00', 0), at('b', '14:00', 10), at('c', '20:00', 20)];
  it('moves up between the two above', () => expect(neighboursAfterMove(day, 'c', -1)).toEqual([0, 10]));
  it('moves up to the top', () => expect(neighboursAfterMove(day, 'b', -1)).toEqual([null, 0]));
  it('moves down between the two below', () => expect(neighboursAfterMove(day, 'a', 1)).toEqual([10, 20]));
  it('moves down to the bottom', () => expect(neighboursAfterMove(day, 'b', 1)).toEqual([20, null]));
  it('cannot move past the ends', () => {
    expect(neighboursAfterMove(day, 'a', -1)).toBeNull();
    expect(neighboursAfterMove(day, 'c', 1)).toBeNull();
  });
  it('ignores an unknown id', () => expect(neighboursAfterMove(day, 'zzz', 1)).toBeNull());
});

describe('suggestStartTime', () => {
  const ev = (id: string, startTime: string, position: number, durationMinutes: number | null) => ({
    id,
    startTime,
    position,
    durationMinutes,
  });
  it('starts at noon on an empty list', () => expect(suggestStartTime([])).toBe('12:00'));
  it('continues where the last event ends', () => {
    expect(suggestStartTime([ev('b', '16:00', 20, 60), ev('a', '10:00', 10, 30)])).toBe('17:00');
  });
  it('stays at the last start when the end would pass midnight', () => {
    expect(suggestStartTime([ev('a', '23:30', 10, 90)])).toBe('23:30');
    expect(suggestStartTime([ev('a', '23:00', 10, 60)])).toBe('23:00');
    expect(suggestStartTime([ev('a', '23:00', 10, 59)])).toBe('23:59');
  });
  it('falls back to the last start without a duration', () => {
    expect(suggestStartTime([ev('a', '10:00', 10, 30), ev('b', '16:00', 20, null)])).toBe('16:00');
  });
});
