import { EPG } from '../constants';

export default class MockDataService {
  static availableProgramLength = [
    1000 * 60 * 15, // 15 minutes
    1000 * 60 * 30, // 30 minutes
    1000 * 60 * 45, // 45 minutes
    1000 * 60 * 60, // 60 minutes
    1000 * 60 * 120, // 120 minutes
  ];

  static availableProgramTitles = [
    'Avengers',
    'How I Met Your Mother',
    'Silicon Valley',
    'Late Night with Jimmy Fallon',
    'The Big Bang Theory',
    'Leon',
    'Die Hard',
  ];

  static availableChannelLogos = [
    'http://s3-eu-west-1.amazonaws.com/rockettv.media.images/popcorn/images/channels/v3/logos/default/CNN_88.png',
    'http://s3-eu-west-1.amazonaws.com/rockettv.media.images/popcorn/images/channels/v3/logos/default/MB1_88.png',
    'http://s3-eu-west-1.amazonaws.com/rockettv.media.images/popcorn/images/channels/v3/logos/default/NGO_88.png',
    'http://s3-eu-west-1.amazonaws.com/rockettv.media.images/popcorn/images/channels/v3/logos/default/FXH_60.png',
    'http://s3-eu-west-1.amazonaws.com/rockettv.media.images/popcorn/images/channels/v3/logos/default/TRM_88.png',
  ];

  static getMockData() {
    const channels = [];

    const now = Date.now();

    for (let i = 0; i < 20; i++) {
      const channel = {
          icon: MockDataService.availableChannelLogos[i % 5],
          name: `Channel ${i + 1}`,
          id: i.toString(),
          events: MockDataService.createEvents(now)
      }

      channels.push(channel);
    }

    return channels;
  }

  static createEvents(now) {
    const events = [];

    const epgStart = now - EPG.pastDays;
    const epgEnd = now + EPG.futureDays;

    let currentTime = epgStart;

    while (currentTime <= epgEnd) {
      const eventEnd = MockDataService.getEventEnd(currentTime);
      const event = {
          start: currentTime,
          end: eventEnd,
          title: MockDataService.availableProgramTitles[Math.floor(Math.random() * 6 + 0)]
      }
    
      events.push(event);
      currentTime = eventEnd;
    }

    return events;
  }

  static getEventEnd(eventStart) {
    let length =
      MockDataService.availableProgramLength[Math.floor(Math.random() * 4 + 0)];
    return eventStart + length;
  }
}
