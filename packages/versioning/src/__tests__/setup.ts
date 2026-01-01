import * as fs from 'fs-extra';
import simpleGit from 'simple-git';
import conventionalChangelog from 'conventional-changelog';

jest.mock('fs-extra');
jest.mock('simple-git');
jest.mock('conventional-changelog');