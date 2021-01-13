import { EPG } from '../constants';

export default class EPGUtils {
  static getShortTime(time) {
    const currentTime = new Date(time);
    let hour = currentTime.getHours();
    let minutes = currentTime.getMinutes();
    let ampm = 'AM';
    if (minutes < 15) {
      minutes = '00';
    } else if (minutes < 45) {
      minutes = '30';
    } else {
      minutes = '00';
      hour += 1;
    }
    if (hour > 23) {
      hour = 12;
    } else if (hour > 12) {
      hour -= 12;
      ampm = 'PM';
    } else if (hour === 12) {
      ampm = 'PM';
    } else if (hour === 0) {
      hour = 12;
    }

    return `${hour}:${minutes} ${ampm}`;
  }

  static getWeekdayName(date) {
    const days = ['Sun', 'Mon', 'Tues', 'Wed', 'Thus', 'Fri', 'Sat'];
    const parsedDate = new Date(date);
    return days[parsedDate.getDay()];
  }

  static getNearestHalfHour(minTimeBoundary, index) {
    return (
      EPG.timeLabelPeriod
      * ((minTimeBoundary + EPG.timeLabelPeriod * index + EPG.timeLabelPeriod / 2)
        / EPG.timeLabelPeriod)
    );
  }

  static fittingString(ctx, str, maxWidth) {
    let crop = str;
    let textWidth = ctx.measureText(str).width;
    const ellipsis = '…';
    const ellipsisWidth = ctx.measureText(ellipsis).width;
    if (textWidth <= maxWidth) {
      return str;
    }
    let len = str.length;
    while (textWidth >= maxWidth - ellipsisWidth && len > 0) {
      len -= 1;
      crop = str.substring(0, len);
      textWidth = ctx.measureText(crop).width;
    }

    return crop + ellipsis;
  }
}
