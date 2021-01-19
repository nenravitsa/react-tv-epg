import React, { PureComponent } from 'react';

import Rect from './Rect';
import MockDataService from './utils/MockDataService';
import * as EPGUtils from './utils/EPGUtils';
import { EPG } from './constants';

export default class TVGuide extends PureComponent {
  static width = window.innerWidth - 30;

  static channelHeight = Math.trunc((window.innerHeight - 40 - EPG.timeBarHeight + EPG.visibleChannelCount)
    / EPG.visibleChannelCount);

  static height = EPG.timeBarHeight + TVGuide.channelHeight * EPG.visibleChannelCount;

  canvasRef = React.createRef<HTMLCanvasElement>();

  containerRef = React.createRef<HTMLDivElement>();

  epgData = MockDataService.getMockData();

  ctx: CanvasRenderingContext2D;

  scrollX = 0;

  scrollY = 0;

  focusedChannelPosition = 0;

  focusedEventPosition = -1;

  minTimeBoundary = 0;

  maxTimeBoundary = 0;

  msPerPixel;

  timeOffset;

  maxHorizontalScroll;

  maxVerticalScroll;

  channelImageCache = new Map();

  drawingRect = new Rect();

  resetBoundaries() {
    this.msPerPixel = EPG.hoursInViewport / (TVGuide.width - EPG.channelWidth);
    this.timeOffset = Date.now() - EPG.pastDays;
    this.minTimeBoundary = this.getTimeFrom(0);
    this.maxTimeBoundary = this.getTimeFrom(TVGuide.width);
  }

  calculateMaxHorizontalScroll() {
    this.maxHorizontalScroll = Math.trunc(
      (EPG.pastDays + EPG.futureDays - EPG.hoursInViewport) / this.msPerPixel,
    );
  }

  calculateMaxVerticalScroll() {
    const maxVerticalScroll = this.getTopFrom(this.epgData.length - 2) + TVGuide.channelHeight;
    const height = TVGuide.height;
    this.maxVerticalScroll = maxVerticalScroll < height ? 0 : maxVerticalScroll - height;
  }

  getProgramPosition(channelPosition, time) {
    const { events } = this.epgData[channelPosition];
    if (events != null) {
      for (let eventPos = 0; eventPos < events.length; eventPos += 1) {
        const event = events[eventPos];
        if (event.start <= time && event.end >= time) {
          return eventPos;
        }
      }
    }
    return -1;
  }

  getFirstVisibleChannelPosition() {
    const position = Math.trunc(
      (this.scrollY - EPG.timeBarHeight) / TVGuide.channelHeight,
    );

    return position < 0 ? 0 : position;
  }

  getLastVisibleChannelPosition() {
    const totalChannelCount = this.epgData.length;
    const screenHeight = TVGuide.height;
    let position = Math.trunc(
      (this.scrollY + screenHeight + EPG.timeBarHeight) / TVGuide.channelHeight,
    );

    if (position > totalChannelCount - 1) {
      position = totalChannelCount - 1;
    }

    // Add one extra row if we don't fill screen with current
    return this.scrollY + screenHeight > position * TVGuide.channelHeight
      && position < totalChannelCount - 1
      ? position + 1
      : position;
  }

  getXFrom(time) {
    return Math.trunc(
      (time - this.minTimeBoundary) / this.msPerPixel + EPG.channelWidth,
    );
  }

  getTopFrom(position) {
    const y = position * TVGuide.channelHeight + EPG.timeBarHeight;

    return y - this.scrollY;
  }

  getXPositionStart() {
    return this.getXFrom(Date.now() - EPG.hoursInViewport / 2);
  }

  getTimeFrom(x) {
    return x * this.msPerPixel + this.timeOffset;
  }

  shouldDrawTimeLine(now) {
    return now >= this.minTimeBoundary && now < this.maxTimeBoundary;
  }

  isEventVisible(start, end) {
    return (
      (start >= this.minTimeBoundary && start <= this.maxTimeBoundary)
      || (end >= this.minTimeBoundary && end <= this.maxTimeBoundary)
      || (start <= this.minTimeBoundary && end >= this.maxTimeBoundary)
    );
  }

  draw() {
    if (this.epgData != null && this.epgData.length) {
      this.minTimeBoundary = this.getTimeFrom(this.scrollX);
      this.maxTimeBoundary = this.getTimeFrom(this.scrollX + TVGuide.width);

      this.drawChannelListItems();
      this.drawEvents();
      this.drawTimeBar();
      this.drawTimeLine();
    }
  }

  drawTimeBar() {
    this.drawingRect.left = EPG.channelWidth;
    this.drawingRect.top = 0;
    this.drawingRect.right = this.drawingRect.left + TVGuide.width;
    this.drawingRect.bottom = this.drawingRect.top + EPG.timeBarHeight;

    // Background
    EPGUtils.drawRect(this.ctx, this.drawingRect, EPG.channelBg);
    EPGUtils.drawBorder(this.ctx, this.drawingRect);

    // Time stamps
    this.ctx.fillStyle = EPG.eventTextColor;

    for (let i = 0; i < EPG.hoursInViewport / EPG.timeLabelPeriod; i += 1) {
      // Get time and round to nearest half hour
      const time = EPGUtils.getNearestHalfHour(this.minTimeBoundary, i);

      this.ctx.fillText(
        EPGUtils.getShortTime(time),
        this.getXFrom(time),
        this.drawingRect.top + ((this.drawingRect.bottom - this.drawingRect.top) / 2
          + EPG.timeBarTextSize / 2),
      );
    }

    this.drawTimeBarDayIndicator();
  }

  drawTimeBarDayIndicator() {
    this.drawingRect.left = 0;
    this.drawingRect.top = 0;
    this.drawingRect.right = this.drawingRect.left + EPG.channelWidth;
    this.drawingRect.bottom = this.drawingRect.top + EPG.timeBarHeight;

    // Background
    EPGUtils.drawRect(this.ctx, this.drawingRect, EPG.channelBg);

    // Text
    this.ctx.fillStyle = EPG.eventTextColor;
    this.ctx.textAlign = 'center';

    this.ctx.fillText(
      EPGUtils.getWeekdayName(this.minTimeBoundary),
      this.drawingRect.left + (this.drawingRect.right - this.drawingRect.left) / 2,
      this.drawingRect.top + ((this.drawingRect.bottom - this.drawingRect.top) / 2
        + EPG.timeBarTextSize / 2),
    );

    this.ctx.textAlign = 'left';
  }

  drawTimeLine() {
    const now = Date.now();
    if (this.shouldDrawTimeLine(now)) {
      this.drawingRect.left = this.getXFrom(now);
      this.drawingRect.top = EPG.timeBarHeight;
      this.drawingRect.right = this.drawingRect.left + EPG.timeBarLineWidth;
      this.drawingRect.bottom = this.drawingRect.top + TVGuide.height;

      EPGUtils.drawRect(this.ctx, this.drawingRect, EPG.timeBarLineColor);

      const triangleHeight = 10 * Math.cos(Math.PI / 6);
      const triangleY = EPG.timeBarHeight - 7;
      const triangleX = this.drawingRect.left + EPG.timeBarLineWidth / 2;
      this.ctx.beginPath();
      this.ctx.moveTo(triangleX - 5, triangleY);
      this.ctx.lineTo(triangleX + 5, triangleY);
      this.ctx.lineTo(triangleX, triangleY + triangleHeight);
      this.ctx.closePath();
      this.ctx.fillStyle = EPG.timeBarLineColor;
      this.ctx.fill();
    }
  }

  drawEvents() {
    const firstPos = this.getFirstVisibleChannelPosition();
    const lastPos = this.getLastVisibleChannelPosition();

    for (let pos = firstPos; pos <= lastPos; pos += 1) {
      // Draw each event
      let foundFirst = false;

      const { events } = this.epgData[pos];

      for (let i = 0; i < events.length; i += 1) {
        if (this.isEventVisible(events[i].start, events[i].end)) {
          this.drawEvent(pos, events[i]);
          foundFirst = true;
        } else if (foundFirst) {
          break;
        }
      }
    }
  }

  drawEvent(channelPosition: number, event) {
    this.setEventDrawingRectangle(channelPosition, event);

    const isCurrent = Date.now() >= event.start && Date.now() <= event.end;
    const channel = this.epgData[channelPosition];

    // Background
    this.ctx.fillStyle = isCurrent ? EPG.eventBgCurrent : EPG.eventBg;
    if (channelPosition === this.focusedChannelPosition) {
      if (this.focusedEventPosition !== -1) {
        const program = channel.events[this.focusedEventPosition];
        if (program === event) {
          this.ctx.fillStyle = EPG.eventBgFocus;
        }
      } else if (isCurrent) {
        this.focusedEventPosition = channel.events.findIndex(
          (program) => program.start === event.start && program.end === event.end,
        );

        this.ctx.fillStyle = EPG.eventBgFocus;
      }
    }
    // if Clip is not working properly, hack
    if (this.drawingRect.left < EPG.channelWidth) {
      this.drawingRect.left = EPG.channelWidth;
    }

    EPGUtils.drawRect(this.ctx, this.drawingRect);
    EPGUtils.drawBorder(this.ctx, this.drawingRect);

    // Add left and right inner padding
    this.drawingRect.left += EPG.channelPadding;
    this.drawingRect.right -= EPG.channelPadding;

    // Text
    this.ctx.fillStyle = EPG.eventTextColor;

    this.ctx.font = '20px Arial';

    this.drawingRect.top += (this.drawingRect.bottom - this.drawingRect.top) / 2 + 8;

    const title = EPGUtils.fittingString(this.ctx, event.title, this.drawingRect.width);

    this.ctx.fillText(
      title,
      this.drawingRect.left,
      this.drawingRect.top,
    );
  }

  setEventDrawingRectangle(channelPosition, event) {
    this.drawingRect.left = this.getXFrom(event.start);
    this.drawingRect.top = this.getTopFrom(channelPosition);
    this.drawingRect.right = this.getXFrom(event.end);
    this.drawingRect.bottom = this.drawingRect.top + TVGuide.channelHeight;
  }

  drawChannelListItems() {
    // Background
    this.drawingRect.left = 0;
    this.drawingRect.top = 0;
    this.drawingRect.right = this.drawingRect.left + EPG.channelWidth;
    this.drawingRect.bottom = this.drawingRect.top + TVGuide.height;

    EPGUtils.drawRect(this.ctx, this.drawingRect, EPG.channelBg);

    const firstPos = this.getFirstVisibleChannelPosition();
    const lastPos = this.getLastVisibleChannelPosition();

    for (let pos = firstPos; pos <= lastPos; pos += 1) {
      this.drawChannelItem(pos);
    }
  }

  drawChannelItem(position) {
    this.drawingRect.left = 0;
    this.drawingRect.top = this.getTopFrom(position);
    this.drawingRect.right = this.drawingRect.left + EPG.channelWidth;
    this.drawingRect.bottom = this.drawingRect.top + TVGuide.channelHeight;

    const imageURL = this.epgData[position].icon;

    if (this.channelImageCache.has(imageURL)) {
      const image = this.channelImageCache.get(imageURL);
      this.getDrawingRectForChannelIcon(image);

      this.ctx.drawImage(
        image,
        this.drawingRect.left,
        this.drawingRect.top,
        this.drawingRect.width,
        this.drawingRect.height,
      );
    } else {
      const img = new Image();
      img.src = imageURL;
      img.onload = () => {
        this.channelImageCache.set(imageURL, img);
      };
    }
  }

  getDrawingRectForChannelIcon(image) {
    this.drawingRect.left += EPG.channelPadding;
    this.drawingRect.top += EPG.channelPadding;
    this.drawingRect.right -= EPG.channelPadding;
    this.drawingRect.bottom -= EPG.channelPadding;

    const imageWidth = image.width;
    const imageHeight = image.height;
    const imageRatio = imageHeight / parseFloat(imageWidth);

    const rectWidth = this.drawingRect.right - this.drawingRect.left;
    const rectHeight = this.drawingRect.bottom - this.drawingRect.top;

    // Keep aspect ratio.
    if (imageWidth > imageHeight) {
      const padding = Math.trunc((rectHeight - rectWidth * imageRatio) / 2);
      this.drawingRect.top += padding;
      this.drawingRect.bottom -= padding;
    } else if (imageWidth <= imageHeight) {
      const padding = Math.trunc((rectWidth - rectHeight / imageRatio) / 2);
      this.drawingRect.left += padding;
      this.drawingRect.right -= padding;
    }
  }

  handleClick = () => {
    this.scrollX += Math.trunc(EPG.timeLabelPeriod / this.msPerPixel);
    this.ctx.clearRect(0, 0, TVGuide.width, TVGuide.height);
    this.drawingRect = new Rect();
    this.draw();
  };

  initialDraw() {
    if (this.epgData != null && this.epgData.length) {
      this.resetBoundaries();

      this.calculateMaxVerticalScroll();
      this.calculateMaxHorizontalScroll();

      this.scrollX = this.getXPositionStart();
      this.scrollY = 0;

      this.draw();
    }
  }

  handleKeyPress = (event) => {
    const { keyCode } = event;
    let programPosition = this.focusedEventPosition;
    let channelPosition = this.focusedChannelPosition;
    const focusedChannelEvents = this.epgData[this.focusedChannelPosition].events;
    let dx = 0;
    let dy = 0;
    switch (keyCode) {
      case 37:
        programPosition -= 1;
        if (programPosition > -1) {
          const program = focusedChannelEvents[programPosition];
          if (program) {
            this.focusedEventPosition = programPosition;
            dx = -Math.trunc(
              (program.end - program.start) / this.msPerPixel,
            );
          }
        }
        this.scrollX += dx;
        break;
      case 38:
        channelPosition -= 1;
        if (channelPosition >= 0) {
          dy = -TVGuide.channelHeight;
          this.focusedEventPosition = this.getProgramPosition(
            channelPosition,
            this.getTimeFrom(this.scrollX + TVGuide.width / 2),
          );
          const withScroll = (channelPosition >= EPG.visibleChannelCount - EPG.verticalScrollPadding)
            && (this.epgData.length - channelPosition !== EPG.verticalScrollPadding);

          if (withScroll) {
            this.scrollY += dy;
          }

          this.focusedChannelPosition = channelPosition;
        }
        break;
      case 39:
        programPosition += 1;
        if (programPosition > -1 && programPosition < focusedChannelEvents.length) {
          const program = focusedChannelEvents[programPosition];
          if (program) {
            this.focusedEventPosition = programPosition;
            dx = Math.trunc((program.end - program.start) / this.msPerPixel);
          }
        }
        this.scrollX += dx;
        break;
      case 40:
        channelPosition += 1;
        if (channelPosition < this.epgData.length) {
          dy = TVGuide.channelHeight;
          this.focusedEventPosition = this.getProgramPosition(
            channelPosition,
            this.getTimeFrom(this.scrollX + TVGuide.width / 2),
          );

          const withScroll = (channelPosition > EPG.visibleChannelCount - EPG.verticalScrollPadding)
            && (channelPosition !== this.epgData.length - EPG.verticalScrollPadding)

          if (withScroll) {
            this.scrollY += dy;
          }
          this.focusedChannelPosition = channelPosition;
        }
        break;
      default:
        break;
    }

    this.updateCanvas();
  };

  updateCanvas() {
    this.ctx.clearRect(0, 0, TVGuide.width, TVGuide.height);
    this.drawingRect = new Rect();
    this.draw();
  }

  componentDidMount() {
    this.ctx = this.canvasRef.current.getContext('2d');
    this.initialDraw();
    this.focusEPG();
  }

  focusEPG() {
    this.containerRef.current.focus();
  }

  render() {
    return (
      <div
        tabIndex={-1}
        onKeyDown={this.handleKeyPress}
        ref={this.containerRef}
      >
        <canvas
          ref={this.canvasRef}
          width={TVGuide.width}
          height={TVGuide.height}
        />
      </div>
    );
  }
}
