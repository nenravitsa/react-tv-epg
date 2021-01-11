import React, { Component } from 'react';

import Rect from '../models/Rect';
import EPGData from '../utils/EPGData';
import EPGUtils from '../utils/EPGUtils';
import { EPG } from '../constants';
import Styles from '../styles/app.css';

export default class TVGuide extends Component {
  static width = 1280;
  static DAYS_BACK_MILLIS = 1 * 24 * 60 * 60 * 1000; // 3 days
  static DAYS_FORWARD_MILLIS = 1 * 24 * 60 * 60 * 1000; // 3 days
  static hoursInViewport = 2 * 60 * 60 * 1000; // 2 hours
  static TIME_LABEL_SPACING_MILLIS = 30 * 60 * 1000; // 30 minutes

  static VISIBLE_CHANNEL_COUNT = 6; // No of channel to show at a time
  static VERTICAL_SCROLL_BOTTOM_PADDING_ITEM = 2;
  static VERTICAL_SCROLL_TOP_PADDING_ITEM = 2;
  canvasRef;

  constructor(props) {
    super(props);
    this.epgData = new EPGData();
    this.epgUtils = new EPGUtils();

    this.scrollX = 0;
    this.scrollY = 0;
    this.focusedChannelPosition = 0;
    this.focusedEventPosition = -1;

    this.channelImageCache = new Map();

    this.clipRect = new Rect();
    this.drawingRect = new Rect();
    this.measuringRect = new Rect();
  }

  static getHeight() {
    return (
      EPG.timeBarHeight +
      (EPG.channelMargin + EPG.channelHeight) * EPG.visibleChannelCount
    );
  }

  resetBoundaries() {
    this.msPerPixel = this.calculateMsPerPixel();
    this.mTimeOffset = this.calculatedBaseLine();
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
      this.getTopFrom(this.epgData.getChannelCount() - 2) + EPG.channelHeight;
    const height = TVGuide.getHeight();
    this.maxVerticalScroll =
      maxVerticalScroll < height ? 0 : maxVerticalScroll - height;
  }

  calculateMsPerPixel() {
    return (
      EPG.hoursInViewport /
      (TVGuide.width - EPG.channelWidth - EPG.channelMargin)
    );
  }

  calculatedBaseLine() {
    return Date.now() - EPG.pastDays;
  }

  getProgramPosition(channelPosition, time) {
    let events = this.epgData.getEvents(channelPosition);
    if (events != null) {
      for (let eventPos = 0; eventPos < events.length; eventPos++) {
        let event = events[eventPos];
        if (event.getStart() <= time && event.getEnd() >= time) {
          return eventPos;
        }
      }
    }
    return -1;
  }

  getFirstVisibleChannelPosition() {
    const y = this.scrollY;

    const position = Math.trunc(
      (y - EPG.channelMargin - EPG.timeBarHeight) /
        (EPG.channelHeight + EPG.channelMargin),
    );

    return position < 0 ? 0 : position;
  }

  getLastVisibleChannelPosition() {
    const y = this.scrollY;
    const totalChannelCount = this.epgData.getChannelCount();
    const screenHeight = TVGuide.getHeight();
    let position = Math.trunc(
      (y + screenHeight + EPG.timeBarHeight - EPG.channelMargin) /
        (EPG.channelHeight + EPG.channelMargin),
    );

    if (position > totalChannelCount - 1) {
      position = totalChannelCount - 1;
    }

    // Add one extra row if we don't fill screen with current..
    return y + screenHeight > position * EPG.channelHeight &&
      position < totalChannelCount - 1
      ? position + 1
      : position;
  }

  getXFrom(time) {
    return Math.trunc(
      (time - this.minTimeBoundary) / this.msPerPixel +
        EPG.channelMargin +
        EPG.channelWidth +
        EPG.channelMargin,
    );
  }

  getTopFrom(position) {
    const y =
      position * (EPG.channelHeight + EPG.channelMargin) +
      EPG.channelMargin +
      EPG.timeBarHeight;
    return y - this.scrollY;
  }

  getXPositionStart() {
    return this.getXFrom(Date.now() - EPG.hoursInViewport / 2);
  }

  getTimeFrom(x) {
    return x * this.msPerPixel + this.mTimeOffset;
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
    if (this.epgData != null && this.epgData.hasData()) {
      this.minTimeBoundary = this.getTimeFrom(this.scrollX);
      this.maxTimeBoundary = this.getTimeFrom(this.scrollX + TVGuide.width);

      this.drawingRect.left = 0;
      this.drawingRect.top = 0;
      this.drawingRect.right = this.drawingRect.left + TVGuide.width;
      this.drawingRect.bottom = this.drawingRect.top + TVGuide.getHeight();

      this.drawChannelListItems();
      this.drawEvents();
      this.drawTimeBar();
      this.drawTimeLine();
    }
  }

  drawTimeBar() {
    this.drawingRect.left = EPG.channelWidth + EPG.channelMargin;
    this.drawingRect.top = 0;
    this.drawingRect.right = this.drawingRect.left + TVGuide.width;
    this.drawingRect.bottom = this.drawingRect.top + EPG.timeBarHeight;

    this.clipRect.left = EPG.channelWidth + EPG.channelMargin;
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
      const time =
        EPG.timeLabelPeriod *
        ((this.minTimeBoundary +
          EPG.timeLabelPeriod * i +
          EPG.timeLabelPeriod / 2) /
          EPG.timeLabelPeriod);

      this.ctx.fillText(
        this.epgUtils.getShortTime(time),
        this.getXFrom(time),
        this.drawingRect.top +
          ((this.drawingRect.bottom - this.drawingRect.top) / 2 +
            EPG.timeBarTextSize / 2),
      );
    }

    this.drawTimebarDayIndicator();
    this.drawTimebarBottomStroke();
  }

  drawTimebarDayIndicator() {
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
      this.epgUtils.getWeekdayName(this.minTimeBoundary),
      this.drawingRect.left +
        (this.drawingRect.right - this.drawingRect.left) / 2,
      this.drawingRect.top +
        ((this.drawingRect.bottom - this.drawingRect.top) / 2 +
          EPG.timeBarTextSize / 2),
    );

    this.ctx.textAlign = 'left';
  }

  drawTimebarBottomStroke() {
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

    for (let pos = firstPos; pos <= lastPos; pos++) {
      this.clipRect.left = EPG.channelWidth + EPG.channelMargin;
      this.clipRect.top = this.getTopFrom(pos);
      this.clipRect.right = TVGuide.width;
      this.clipRect.bottom = this.clipRect.top + EPG.channelHeight;

      // Draw each event
      let foundFirst = false;

      let epgEvents = this.epgData.getEvents(pos);

      for (let event of epgEvents) {
        if (this.isEventVisible(event.getStart(), event.getEnd())) {
          this.drawEvent(pos, event);
          foundFirst = true;
        } else if (foundFirst) {
          break;
        }
      }
    }
  }

  drawEvent(channelPosition, event) {
    this.setEventDrawingRectangle(channelPosition, event);

    // Background
    this.ctx.fillStyle = event.isCurrent() ? EPG.eventBgCurrent : EPG.eventBg;
    if (channelPosition == this.focusedChannelPosition) {
      if (this.focusedEventPosition != -1) {
        let focusedEvent = this.epgData.getEvent(
          channelPosition,
          this.focusedEventPosition,
        );
        if (focusedEvent == event) {
          this.ctx.fillStyle = EPG.eventBgFocus;
        }
      } else if (event.isCurrent()) {
        this.focusedEventPosition = this.epgData.getEventPosition(
          channelPosition,
          event,
        );
        this.ctx.fillStyle = EPG.eventBgFocus;
      }
    }
    // if Clip is not working properly, hack
    if (this.drawingRect.left < EPG.channelWidth + EPG.channelMargin) {
      this.drawingRect.left = EPG.channelWidth + EPG.channelMargin;
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

    const title = event.getTitle();

    this.ctx.fillText(title, this.drawingRect.left, this.drawingRect.top);
  }

  setEventDrawingRectangle(channelPosition, event) {
    const start = event.getStart();
    const end = event.getEnd();
    this.drawingRect.left = this.getXFrom(start);
    this.drawingRect.top = this.getTopFrom(channelPosition);
    this.drawingRect.right = this.getXFrom(end) - EPG.channelMargin;
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

    let firstPos = this.getFirstVisibleChannelPosition();
    let lastPos = this.getLastVisibleChannelPosition();

    for (let pos = firstPos; pos <= lastPos; pos++) {
      this.drawChannelItem(pos);
    }
  }

  drawChannelItem(position) {
    this.drawingRect.left = 0;
    this.drawingRect.top = this.getTopFrom(position);
    this.drawingRect.right = this.drawingRect.left + EPG.channelWidth;
    this.drawingRect.bottom = this.drawingRect.top + EPG.channelHeight;

    // Loading channel image into target for
    let imageURL = this.epgData.getChannel(position).getImageURL();

    if (this.channelImageCache.has(imageURL)) {
      let image = this.channelImageCache.get(imageURL);
      this.drawingRect = this.getDrawingRectForChannelImage(image);

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
        this.updateCanvas();
      };
    }
  }

  getDrawingRectForChannelImage(image) {
    this.drawingRect.left += EPG.channelPadding;
    this.drawingRect.top += EPG.channelPadding;
    this.drawingRect.right -= EPG.channelPadding;
    this.drawingRect.bottom -= EPG.channelPadding;

    let imageWidth = image.width;
    let imageHeight = image.height;
    let imageRatio = imageHeight / parseFloat(imageWidth);

    let rectWidth = this.drawingRect.right - this.drawingRect.left;
    let rectHeight = this.drawingRect.bottom - this.drawingRect.top;

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

    return this.drawingRect;
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
    if (this.epgData != null && this.epgData.hasData()) {
      this.resetBoundaries();

      this.calculateMaxVerticalScroll();
      this.calculateMaxHorizontalScroll();

      this.scrollX = this.getXPositionStart();
      this.scrollY = 0;

      this.updateCanvas();
    }
  }

  handleKeyPress = (event) => {
    const { keyCode } = event;
    let programPosition = this.focusedEventPosition;
    let channelPosition = this.focusedChannelPosition;
    let dx = 0;
    let dy = 0;
    switch (keyCode) {
      case 37:
        programPosition -= 1;
        if (programPosition > -1) {
          this.focusedEvent = this.epgData.getEvent(
            this.focusedChannelPosition,
            programPosition,
          );
          if (this.focusedEvent) {
            this.focusedEventPosition = programPosition;
            dx =
              -1 *
              parseInt(
                (this.focusedEvent.getEnd() - this.focusedEvent.getStart()) /
                  this.msPerPixel,
              );
          }
        }
        this.scrollX += dx;
        break;
      case 38:
        channelPosition -= 1;
        if (channelPosition >= 0) {
          dy = -1 * (EPG.channelHeight + EPG.channelMargin);
          this.focusedEventPosition = this.getProgramPosition(
            channelPosition,
            this.getTimeFrom(this.scrollX + TVGuide.width / 2),
          );
          if (
            channelPosition >=
            EPG.visibleChannelCount - EPG.verticalScrollBottomPadding
          ) {
            if (
              this.epgData.getChannelCount() - channelPosition !==
              EPG.verticalScrollBottomPadding
            ) {
              this.scrollY += dy;
            }
          }
          console.log(channelPosition);
          this.focusedChannelPosition = channelPosition;
        }
        break;
      case 39:
        programPosition += 1;
        if (
          programPosition > -1 &&
          programPosition <
            this.epgData.getEventCount(this.focusedChannelPosition)
        ) {
          this.focusedEvent = this.epgData.getEvent(
            this.focusedChannelPosition,
            programPosition,
          );
          if (this.focusedEvent) {
            this.focusedEventPosition = programPosition;
            dx = parseInt(
              (this.focusedEvent.getEnd() - this.focusedEvent.getStart()) /
                this.msPerPixel,
            );
          }
        }
        this.scrollX += dx;
        break;
      case 40:
        channelPosition += 1;
        if (channelPosition < this.epgData.getChannelCount()) {
          dy = EPG.channelHeight + EPG.channelMargin;
          this.focusedEventPosition = this.getProgramPosition(
            channelPosition,
            this.getTimeFrom(this.scrollX + TVGuide.width / 2),
          );

          if (
            channelPosition >
            EPG.visibleChannelCount - EPG.verticalScrollBottomPadding
          ) {
            if (
              channelPosition !=
              this.epgData.getChannelCount() - EPG.verticalScrollBottomPadding
            ) {
              this.scrollY += dy;
            }
          }
          console.log(channelPosition);
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
    this.recalculateAndRedraw(false);
    this.focusEPG();
  }

  componentDidUpdate() {
    this.updateCanvas();
  }

  updateCanvas() {
    this.ctx = this.canvasRef.getContext('2d');
    this.onDraw();
  }

  focusEPG() {
    this.canvasRef.focus();
  }

  render() {
    return (
      <div
        id='wrapper'
        tabIndex={-1}
        onKeyDown={this.handleKeyPress}
        className={Styles.background}
      >
        <canvas
          ref={(canvasRef) => {
            this.canvasRef = canvasRef;
          }}
          width={TVGuide.width}
          height={TVGuide.getHeight()}
          style={{ border: '1px solid' }}
        />
      </div>
    );
  }
}
