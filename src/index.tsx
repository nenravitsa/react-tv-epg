import "babel-polyfill";

import React from 'react';
import { render } from 'react-dom';

import TVGuide from './EPG/TVGuide';

const rootEl = document.getElementById('root');

render(<TVGuide />, rootEl);
