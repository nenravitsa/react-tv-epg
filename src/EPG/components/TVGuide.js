import React, { Component } from 'react';

import Rect from '../models/Rect';
import MockDataService from '../utils/MockDataService';
import EPGUtils from '../utils/EPGUtils';
import { EPG } from '../constants';

export default class TVGuide extends Component {
  static width = 1280;

  canvasRef = React.createRef();

  ctx;

  epgData = MockDataService.getMockData();

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

  focusedEvent;

  channelImageCache = new Map();

  clipRect = new Rect();

  drawingRect = new Rect();

  measuringRect = new Rect();

  static getHeight() {
    return (
      EPG.timeBarHeight + EPG.channelHeightWithMargin * EPG.visibleChannelCount
    );
  }

  resetBoundaries() {
    console.log('reset');
    this.msPerPixel =
      EPG.hoursInViewport /
      (TVGuide.width - EPG.channelWidth - EPG.channelMargin);
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
    const maxVerticalScroll =
      this.getTopFrom(this.epgData.length - 2) + EPG.channelHeight;
    const height = TVGuide.getHeight();
    this.maxVerticalScroll =
      maxVerticalScroll < height ? 0 : maxVerticalScroll - height;
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
      (this.scrollY - EPG.channelMargin - EPG.timeBarHeight) /
        EPG.channelHeightWithMargin,
    );

    return position < 0 ? 0 : position;
  }

  getLastVisibleChannelPosition() {
    const totalChannelCount = this.epgData.length;
    const screenHeight = TVGuide.getHeight();
    let position = Math.trunc(
      (this.scrollY + screenHeight + EPG.timeBarHeight - EPG.channelMargin) /
        EPG.channelHeightWithMargin,
    );

    if (position > totalChannelCount - 1) {
      position = totalChannelCount - 1;
    }

    // Add one extra row if we don't fill screen with current
    return this.scrollY + screenHeight > position * EPG.channelHeight &&
      position < totalChannelCount - 1
      ? position + 1
      : position;
  }

  getXFrom(time) {
    return Math.trunc(
      (time - this.minTimeBoundary) / this.msPerPixel +
        EPG.channelMargin * 2 +
        EPG.channelWidth,
    );
  }

  getTopFrom(position) {
    const y =
      position * EPG.channelHeightWithMargin +
      EPG.channelMargin +
      EPG.timeBarHeight;

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
      (start >= this.minTimeBoundary && start <= this.maxTimeBoundary) ||
      (end >= this.minTimeBoundary && end <= this.maxTimeBoundary) ||
      (start <= this.minTimeBoundary && end >= this.maxTimeBoundary)
    );
  }

  onDraw() {
    console.log('DRAW');
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
    this.drawingRect.left = EPG.channelWidthWithMargin;
    this.drawingRect.top = 0;
    this.drawingRect.right = this.drawingRect.left + TVGuide.width;
    this.drawingRect.bottom = this.drawingRect.top + EPG.timeBarHeight;

    this.clipRect.left = EPG.channelWidthWithMargin;
    this.clipRect.top = 0;
    this.clipRect.right = TVGuide.width;
    this.clipRect.bottom = this.clipRect.top + EPG.timeBarHeight;

    // Background
    this.ctx.fillStyle = EPG.channelBg;
    this.ctx.fillRect(
      this.drawingRect.left,
      this.drawingRect.top,
      this.drawingRect.width,
      this.drawingRect.height,
    );

    // Time stamps
    this.ctx.fillStyle = EPG.eventTextColor;

    for (let i = 0; i < EPG.hoursInViewport / EPG.timeLabelPeriod; i += 1) {
      // Get time and round to nearest half hour
      const time = EPGUtils.getNearestHalfHour(this.minTimeBoundary, i);

      this.ctx.fillText(
        EPGUtils.getShortTime(time),
        this.getXFrom(time),
        this.drawingRect.top +
          ((this.drawingRect.bottom - this.drawingRect.top) / 2 +
            EPG.timeBarTextSize / 2),
      );
    }

    this.drawTimeBarDayIndicator();
    this.drawTimeBarBottomStroke();
  }

  drawTimeBarDayIndicator() {
    this.drawingRect.left = 0;
    this.drawingRect.top = 0;
    this.drawingRect.right = this.drawingRect.left + EPG.channelWidth;
    this.drawingRect.bottom = this.drawingRect.top + EPG.timeBarHeight;

    // Background
    this.ctx.fillStyle = EPG.channelBg;
    this.ctx.fillRect(
      this.drawingRect.left,
      this.drawingRect.top,
      this.drawingRect.width,
      this.drawingRect.height,
    );

    // Text
    this.ctx.fillStyle = EPG.eventTextColor;
    this.ctx.textAlign = 'center';

    this.ctx.fillText(
      EPGUtils.getWeekdayName(this.minTimeBoundary),
      this.drawingRect.left +
        (this.drawingRect.right - this.drawingRect.left) / 2,
      this.drawingRect.top +
        ((this.drawingRect.bottom - this.drawingRect.top) / 2 +
          EPG.timeBarTextSize / 2),
    );

    this.ctx.textAlign = 'left';
  }

  drawTimeBarBottomStroke() {
    this.drawingRect.left = 0;
    this.drawingRect.top = EPG.timeBarHeight;
    this.drawingRect.right = this.drawingRect.left + TVGuide.width;
    this.drawingRect.bottom = this.drawingRect.top + EPG.channelMargin;

    // Bottom stroke
    this.ctx.fillStyle = '#1e1e1e';
    this.ctx.fillRect(
      this.drawingRect.left,
      this.drawingRect.top,
      this.drawingRect.width,
      this.drawingRect.height,
    );
  }

  drawTimeLine() {
    const now = Date.now();
    if (this.shouldDrawTimeLine(now)) {
      this.drawingRect.left = this.getXFrom(now);
      this.drawingRect.top = 0;
      this.drawingRect.right = this.drawingRect.left + EPG.timeBarLineWidth;
      this.drawingRect.bottom = this.drawingRect.top + TVGuide.getHeight();
      this.ctx.fillStyle = EPG.timeBarLineColor;
      this.ctx.fillRect(
        this.drawingRect.left,
        this.drawingRect.top,
        this.drawingRect.width,
        this.drawingRect.height,
      );
    }
  }

  drawEvents() {
    const firstPos = this.getFirstVisibleChannelPosition();
    const lastPos = this.getLastVisibleChannelPosition();

    for (let pos = firstPos; pos <= lastPos; pos += 1) {
      this.clipRect.left = EPG.channelWidthWithMargin;
      this.clipRect.top = this.getTopFrom(pos);
      this.clipRect.right = TVGuide.width;
      this.clipRect.bottom = this.clipRect.top + EPG.channelHeight;

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

  drawEvent(channelPosition, event) {
    this.setEventDrawingRectangle(channelPosition, event);

    const isCurrent = Date.now() >= event.start && Date.now() <= event.end;
    const channel = this.epgData[channelPosition];
    // Background
    this.ctx.fillStyle = isCurrent ? EPG.eventBgCurrent : EPG.eventBg;
    if (channelPosition === this.focusedChannelPosition) {
      if (this.focusedEventPosition !== -1) {
        const focusedEvent = channel.events[this.focusedEventPosition];
        if (focusedEvent === event) {
          this.ctx.fillStyle = EPG.eventBgFocus;
        }
      } else if (isCurrent) {
        this.focusedEventPosition = channel.events.findIndex(
          (program) =>
            program.start === event.start && program.end === event.end,
        );

        this.ctx.fillStyle = EPG.eventBgFocus;
      }
    }
    // if Clip is not working properly, hack
    if (this.drawingRect.left < EPG.channelWidthWithMargin) {
      this.drawingRect.left = EPG.channelWidthWithMargin;
    }
    this.ctx.fillRect(
      this.drawingRect.left,
      this.drawingRect.top,
      this.drawingRect.width,
      this.drawingRect.height,
    );

    // Add left and right inner padding
    this.drawingRect.left += EPG.channelPadding;
    this.drawingRect.right -= EPG.channelPadding;

    // Text
    this.ctx.fillStyle = EPG.eventTextColor;

    this.ctx.font = '20px Arial';

    this.drawingRect.top +=
      (this.drawingRect.bottom - this.drawingRect.top) / 6;

    this.ctx.fillText(event.title, this.drawingRect.left, this.drawingRect.top);
  }

  setEventDrawingRectangle(channelPosition, event) {
    this.drawingRect.left = this.getXFrom(event.start);
    this.drawingRect.top = this.getTopFrom(channelPosition);
    this.drawingRect.right = this.getXFrom(event.end) - EPG.channelMargin;
    this.drawingRect.bottom = this.drawingRect.top + EPG.channelHeight;
  }

  drawChannelListItems() {
    // Background
    this.measuringRect.left = 0;
    this.measuringRect.top = 0;
    this.measuringRect.right = this.drawingRect.left + EPG.channelWidth;
    this.measuringRect.bottom = this.measuringRect.top + TVGuide.getHeight();

    this.ctx.fillStyle = EPG.channelBg;
    this.ctx.fillRect(
      this.measuringRect.left,
      this.measuringRect.top,
      this.measuringRect.width,
      this.measuringRect.height,
    );

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
    this.drawingRect.bottom = this.drawingRect.top + EPG.channelHeight;

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
        // do something with that because it triggered to often
        this.onDraw();
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
    this.ctx.clearRect(0, 0, TVGuide.width, TVGuide.getHeight());
    this.clear();
    this.onDraw();
  };

  clear() {
    this.clipRect = new Rect();
    this.drawingRect = new Rect();
    this.measuringRect = new Rect();
  }

  recalculateAndRedraw() {
    console.log('recalc');
    if (this.epgData != null && this.epgData.length) {
      this.resetBoundaries();

      this.calculateMaxVerticalScroll();
      this.calculateMaxHorizontalScroll();

      this.scrollX = this.getXPositionStart();
      this.scrollY = 0;

      this.onDraw();
    }
  }

  handleKeyPress = (event) => {
    const { keyCode } = event;
    let programPosition = this.focusedEventPosition;
    let channelPosition = this.focusedChannelPosition;
    const focusedChannelEvents = this.epgData[this.focusedChannelPosition]
      .events;
    let dx = 0;
    let dy = 0;
    switch (keyCode) {
      case 37:
        programPosition -= 1;
        if (programPosition > -1) {
          this.focusedEvent = focusedChannelEvents[programPosition];
          if (this.focusedEvent) {
            this.focusedEventPosition = programPosition;
            dx =
              -1 *
              Math.trunc(
                (this.focusedEvent.end - this.focusedEvent.start) /
                  this.msPerPixel,
              );
          }
        }
        this.scrollX += dx;
        break;
      case 38:
        channelPosition -= 1;
        if (channelPosition >= 0) {
          dy = -1 * EPG.channelHeightWithMargin;
          this.focusedEventPosition = this.getProgramPosition(
            channelPosition,
            this.getTimeFrom(this.scrollX + TVGuide.width / 2),
          );
          if (
            channelPosition >=
            EPG.visibleChannelCount - EPG.verticalScrollBottomPadding
          ) {
            if (
              this.epgData.length - channelPosition !==
              EPG.verticalScrollBottomPadding
            ) {
              this.scrollY += dy;
            }
          }

          this.focusedChannelPosition = channelPosition;
        }
        break;
      case 39:
        programPosition += 1;
        if (
          programPosition > -1 &&
          programPosition < focusedChannelEvents.length
        ) {
          this.focusedEvent = focusedChannelEvents[programPosition];
          if (this.focusedEvent) {
            this.focusedEventPosition = programPosition;
            dx = Math.trunc(
              (this.focusedEvent.end - this.focusedEvent.start) /
                this.msPerPixel,
            );
          }
        }
        this.scrollX += dx;
        break;
      case 40:
        channelPosition += 1;
        if (channelPosition < this.epgData.length) {
          dy = EPG.channelHeightWithMargin;
          this.focusedEventPosition = this.getProgramPosition(
            channelPosition,
            this.getTimeFrom(this.scrollX + TVGuide.width / 2),
          );

          if (
            channelPosition >
            EPG.visibleChannelCount - EPG.verticalScrollBottomPadding
          ) {
            if (
              channelPosition !==
              this.epgData.length - EPG.verticalScrollBottomPadding
            ) {
              this.scrollY += dy;
            }
          }
          this.focusedChannelPosition = channelPosition;
        }
        break;
      default:
        break;
    }

    this.ctx.clearRect(0, 0, TVGuide.width, TVGuide.getHeight());
    this.clear();
    this.onDraw();
  };

  componentDidMount() {
    console.log('mount')
    this.ctx = this.canvasRef.current.getContext('2d');
    this.recalculateAndRedraw();
    this.focusEPG();
  }

  componentDidUpdate() {
    this.onDraw();
  }

  focusEPG() {
    this.canvasRef.current.focus();
  }

  render() {
    return (
      <div tabIndex={-1} onKeyDown={this.handleKeyPress}>
        <canvas
          ref={this.canvasRef}
          width={TVGuide.width}
          height={TVGuide.getHeight()}
          style={{ border: '1px solid' }}
        />
      </div>
    );
  }
}
