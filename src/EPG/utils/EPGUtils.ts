import { EPG } from '../constants';
import Rect from '../Rect';

export const getWeekdayName = (date: number) => {
  const days = ['Sun', 'Mon', 'Tues', 'Wed', 'Thus', 'Fri', 'Sat'];
  const parsedDate = new Date(date);
  return days[parsedDate.getDay()];
}

export const getShortTime = (time: number) => {
  const currentTime = new Date(time);
  let hour = currentTime.getHours();
  let minutes: number | string = currentTime.getMinutes();
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
};

export const getNearestHalfHour = (minTimeBoundary: number, index: number) => (
  EPG.timeLabelPeriod
  * ((minTimeBoundary + EPG.timeLabelPeriod * index + EPG.timeLabelPeriod / 2)
    / EPG.timeLabelPeriod)
);

export const hexToRGB = (hex: string, alpha?: number) => {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);

  if (alpha) {
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  }
  return `rgb(${r}, ${g}, ${b})`;
};

export const fittingString = (ctx: CanvasRenderingContext2D, str: string, maxWidth: number) => {
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

  return crop.length ? crop + ellipsis : '';
};

export const drawBorder = (ctx: CanvasRenderingContext2D, rect: Rect) => {
  ctx.strokeStyle = '#d3d3de';
  ctx.lineWidth = 0.5;
  ctx.strokeRect(
    rect.left,
    rect.top,
    rect.width,
    rect.height,
  );
};

export const drawRect = (ctx: CanvasRenderingContext2D, rect: Rect, color?: string) => {
  if (color) {
    ctx.fillStyle = color;
  }
  ctx.fillRect(
    rect.left,
    rect.top,
    rect.width,
    rect.height,
  );
};

export const drawImage = (ctx: CanvasRenderingContext2D, rect: Rect, image: HTMLImageElement) => {
  ctx.drawImage(
    image,
    rect.left,
    rect.top,
    rect.width,
    rect.height,
  );
};
