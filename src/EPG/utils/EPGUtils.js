export default class EPGUtils {
    getShortTime(timeMillis) {
        const now = new Date(timeMillis);
        let hour = now.getHours();
        let minutes = now.getMinutes();
        let ampm = "AM";
        if (minutes < 15) {
            minutes = "00";
        } else if (minutes < 45){
            minutes = "30";
        } else {
            minutes = "00";
            ++hour;
        }
        if (hour > 23) {
            hour = 12;
        } else if (hour > 12) {
            hour = hour - 12;
            ampm = "PM";
        } else if (hour == 12) {
            ampm = "PM";
        } else if (hour == 0) {
            hour = 12;
        }

        return(hour + ":" + minutes + " " + ampm);
        //return dateWithouthSecond.getHours() + ":" + dateWithouthSecond.getMinutes();
    }

    getWeekdayName(dateMillis) {
        let days = ['Sun','Mon','Tues','Wed','Thus','Fri','Sat'];
        let date = new Date(dateMillis);
        return days[ date.getDay() ];
    }

    scaleBetween(unscaledNum, max, min = 0, minAllowed = 0, maxAllowed = 1280) {
        return parseInt((maxAllowed - minAllowed) * (unscaledNum - min) / (max - min) + minAllowed);
    }
}