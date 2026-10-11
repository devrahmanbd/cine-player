// Copyright (C) 2017-2026 Smart code 203358507
/* global describe, test, expect */

const { getMonthInfo, bucketVideosByDate, buildCalendarMonth } = require('./calendarUtils');

describe('getMonthInfo', () => {
    test('computes days for a leap February', () => {
        expect(getMonthInfo(2024, 2, new Date(2023, 5, 15)).days).toBe(29);
    });

    test('computes Monday-first weekday offset', () => {
        // 2024-02-01 was a Thursday, so Monday-first offset is 3.
        expect(getMonthInfo(2024, 2, new Date(2023, 5, 15)).firstWeekday).toBe(3);
    });

    test('today is null outside the viewed month', () => {
        expect(getMonthInfo(2024, 2, new Date(2023, 5, 15)).today).toBe(null);
    });

    test('today is the day of month inside the viewed month', () => {
        expect(getMonthInfo(2024, 2, new Date(2024, 1, 14)).today).toBe(14);
    });
});

describe('bucketVideosByDate', () => {
    const streams = (id) => ({ metaDetailsStreams: `/metadetails/series/${id}` });

    test('buckets series episodes onto their release day', () => {
        const items = bucketVideosByDate([
            { id: 'tt1:1:1', name: 'Show', poster: 'p', title: 'Pilot', season: 1, episode: 1, released: '2024-02-14T00:00:00.000Z', deepLinks: streams('tt1') },
            { id: 'tt1:1:2', name: 'Show', poster: 'p', title: 'Second', season: 1, episode: 2, released: '2024-02-14T12:00:00.000Z', deepLinks: streams('tt1') },
        ], 2024, 2);
        expect(items).toHaveLength(29);
        const day = items.find(({ date }) => date.day === 14);
        expect(day.date).toEqual({ day: 14, month: 2, year: 2024 });
        expect(day.items).toHaveLength(2);
        expect(day.items[0]).toEqual({
            id: 'tt1:1:1',
            name: 'Show',
            poster: 'p',
            title: 'Pilot',
            season: 1,
            episode: 1,
            deepLinks: streams('tt1'),
        });
    });

    test('places movies on their released date as single-day entries', () => {
        const items = bucketVideosByDate([
            { id: 'tt2', name: 'Film', poster: null, title: 'Film', season: undefined, episode: undefined, released: '2024-02-03T00:00:00.000Z', deepLinks: { metaDetailsStreams: '/metadetails/movie/tt2' } },
        ], 2024, 2);
        expect(items.find(({ date }) => date.day === 3).items).toHaveLength(1);
        expect(items.find(({ date }) => date.day === 4).items).toHaveLength(0);
    });

    test('skips missing and unparseable dates fail-open', () => {
        const items = bucketVideosByDate([
            { id: 'a', name: 'A', released: null, deepLinks: streams('a') },
            { id: 'b', name: 'B', released: undefined, deepLinks: streams('b') },
            { id: 'c', name: 'C', released: 'not-a-date', deepLinks: streams('c') },
            { id: 'd', name: 'D', released: new Date(NaN), deepLinks: streams('d') },
            { id: 'e', name: 'E', released: '2024-03-01T00:00:00.000Z', deepLinks: streams('e') },
            { id: 'f', name: 'F', released: '2024-02-10T00:00:00.000Z', deepLinks: streams('f') },
        ], 2024, 2);
        const dated = items.filter(({ items }) => items.length);
        expect(dated).toHaveLength(1);
        expect(dated[0].date.day).toBe(10);
    });

    test('accepts Date instances and skips non-object entries', () => {
        const items = bucketVideosByDate([
            null,
            'junk',
            { id: 'g', name: 'G', released: new Date(2024, 1, 20), deepLinks: streams('g') },
        ], 2024, 2);
        expect(items.find(({ date }) => date.day === 20).items).toHaveLength(1);
    });
});

describe('buildCalendarMonth', () => {
    test('composes monthInfo with one bucket per day', () => {
        const { monthInfo, items } = buildCalendarMonth(2024, 2, [], new Date(2023, 5, 15));
        expect(monthInfo).toEqual({ today: null, days: 29, firstWeekday: 3 });
        expect(items).toHaveLength(29);
        expect(items[0].date).toEqual({ day: 1, month: 2, year: 2024 });
    });
});
