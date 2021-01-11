import MockDataService from '../utils/MockDataService';

export default class EPGData {
    constructor() {
        this.data = MockDataService.getMockData();
        if (this.data) {
            this.channels = this.data;
        }
    }

    getChannel(position) {
        return this.channels[position];
    }

    getEvents(channelPosition) {
        let channel = this.channels[channelPosition];
        let events = channel.getEvents();
        return events
    }

    getEventCount(channelPosition) {
        return this.getEvents(channelPosition).length;
    }

    getEvent(channelPosition, programPosition) {
        let channel = this.channels[channelPosition];
        let events = channel.getEvents();
        return events[programPosition];
    }

    getEventPosition(channelPosition, event) {
        let events = this.channels[channelPosition].getEvents();
        for (let i = 0; i < events.length; i++) {
            if (this.isEventSame(event, events[i])) {
                return i;
            }
        }
    }

    getChannelCount() {
        return this.channels.length;
    }

    isEventSame(event1, event2) {
        if (event1.getStart() == event2.getStart() && event1.getEnd() == event2.getEnd()) {
            return true;
        }
        return false;
    }

    hasData() {
        return this.getChannelCount() > 0;
    }
}