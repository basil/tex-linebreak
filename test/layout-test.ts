import { assert } from 'chai';
import { XorShift } from 'xorshift';

import {
  adjustmentRatios,
  breakLines,
  forcedBreak,
  positionItems,
  Box,
  Glue,
  InputItem,
  MaxAdjustmentExceededError,
  Penalty,
} from '../src/layout';

import { layoutItemsFromString, TextBox, TextGlue, TextInputItem } from '../src/helpers';

import { box, chunk, glue, lineStrings, penalty } from './util';

import fixture from './fixtures/layout';

interface LayoutFixture {
  /** Input text of paragraph. */
  input: string;

  outputs: {
    /** Line-breaking options. */
    layoutOptions: {
      maxAdjustmentRatio: number;
      charWidth: number;
      lineWidths: number | number[];
    };

    /** Expected broken lines. */
    lines: string[];
  }[];
}

/**
 * Read paragraph layout fixture from a file.
 *
 * The format of the fixture files is:
 *
 * ```
 * {input text}
 *
 * {output 0 settings}
 *
 * {output 0 lines}
 *
 * {output 1 settings }
 *
 * {output 1 lines}
 * ...
 * ```
 */
function readLayoutFixture(content: string): LayoutFixture {
  const defaultSettings = {
    charWidth: 5,
    maxAdjustmentRatio: 1,
  };

  const sections = content.split('\n\n');
  const input = sections[0];
  const outputs = [];
  for (let i = 1; i < sections.length; i += 2) {
    const outputSettings = JSON.parse(sections[i]);
    const outputLines = sections[i + 1].split('\n').filter(l => l.length > 0);

    outputs.push({
      layoutOptions: {
        ...defaultSettings,
        ...outputSettings,
      },
      lines: outputLines,
    });
  }

  return {
    input,
    outputs,
  };
}

function repeat<T>(arr: T[], count: number) {
  let result = [];
  while (count) {
    --count;
    result.push(...arr);
  }
  return result;
}

function itemsFromString(s: string, charWidth: number, glueStretch: number): TextInputItem[] {
  const items = s.split(/(\s+|-)/).map(substr => {
    const width = substr.length * charWidth;
    if (substr.match(/^\s+$/)) {
      return { type: 'glue', width, shrink: 2, stretch: glueStretch, text: substr } as TextGlue;
    } else if (substr === '-') {
      return { type: 'penalty', width, flagged: true, cost: 5 } as Penalty;
    } else {
      return { type: 'box', width, text: substr } as TextBox;
    }
  });
  items.push({ type: 'glue', width: 0, shrink: 0, stretch: 1000, text: '' });
  items.push(forcedBreak());
  return items;
}

function frogPrince(): TextInputItem[] {
  // Traditional Monotype character widths in machine units (1/18th of an em)
  // from p. 75 of Digital Typography
  return [
    { type: 'box', width: 16, text: 'In' } as TextBox,
    { type: 'glue', width: 6, stretch: 3, shrink: 2, text: ' ' } as TextGlue,
    { type: 'box', width: 42, text: 'olden' } as TextBox,
    { type: 'glue', width: 6, stretch: 3, shrink: 2, text: ' ' } as TextGlue,
    { type: 'box', width: 42, text: 'times' } as TextBox,
    { type: 'glue', width: 6, stretch: 3, shrink: 2, text: ' ' } as TextGlue,
    { type: 'box', width: 41, text: 'when' } as TextBox,
    { type: 'glue', width: 6, stretch: 3, shrink: 2, text: ' ' } as TextGlue,
    { type: 'box', width: 35, text: 'wish' } as TextBox,
    { type: 'penalty', width: 6, cost: 50, flagged: true },
    { type: 'box', width: 24, text: 'ing' } as TextBox,
    { type: 'glue', width: 6, stretch: 3, shrink: 2, text: ' ' } as TextGlue,
    { type: 'box', width: 29, text: 'still' } as TextBox,
    { type: 'glue', width: 6, stretch: 3, shrink: 2, text: ' ' } as TextGlue,
    { type: 'box', width: 51, text: 'helped' } as TextBox,
    { type: 'glue', width: 6, stretch: 3, shrink: 2, text: ' ' } as TextGlue,
    { type: 'box', width: 32, text: 'one,' } as TextBox,
    { type: 'glue', width: 6, stretch: 4, shrink: 2, text: ' ' } as TextGlue,
    { type: 'box', width: 40, text: 'there' } as TextBox,
    { type: 'glue', width: 6, stretch: 3, shrink: 2, text: ' ' } as TextGlue,
    { type: 'box', width: 37, text: 'lived' } as TextBox,
    { type: 'glue', width: 6, stretch: 3, shrink: 2, text: ' ' } as TextGlue,
    { type: 'box', width: 9, text: 'a' } as TextBox,
    { type: 'glue', width: 6, stretch: 3, shrink: 2, text: ' ' } as TextGlue,
    { type: 'box', width: 34, text: 'king' } as TextBox,
    { type: 'glue', width: 6, stretch: 3, shrink: 2, text: ' ' } as TextGlue,
    { type: 'box', width: 47, text: 'whose' } as TextBox,
    { type: 'glue', width: 6, stretch: 3, shrink: 2, text: ' ' } as TextGlue,
    { type: 'box', width: 48, text: 'daugh' } as TextBox,
    { type: 'penalty', width: 6, cost: 50, flagged: true },
    { type: 'box', width: 29, text: 'ters' } as TextBox,
    { type: 'glue', width: 6, stretch: 3, shrink: 2, text: ' ' } as TextGlue,
    { type: 'box', width: 36, text: 'were' } as TextBox,
    { type: 'glue', width: 6, stretch: 3, shrink: 2, text: ' ' } as TextGlue,
    { type: 'box', width: 19, text: 'all' } as TextBox,
    { type: 'glue', width: 6, stretch: 3, shrink: 2, text: ' ' } as TextGlue,
    { type: 'box', width: 37, text: 'beau' } as TextBox,
    { type: 'penalty', width: 6, cost: 50, flagged: true },
    { type: 'box', width: 12, text: 'ti' } as TextBox,
    { type: 'penalty', width: 6, cost: 50, flagged: true },
    { type: 'box', width: 26, text: 'ful;' } as TextBox,
    { type: 'glue', width: 6, stretch: 4, shrink: 1, text: ' ' } as TextGlue,
    { type: 'box', width: 29, text: 'and' } as TextBox,
    { type: 'glue', width: 6, stretch: 3, shrink: 2, text: ' ' } as TextGlue,
    { type: 'box', width: 25, text: 'the' } as TextBox,
    { type: 'glue', width: 6, stretch: 3, shrink: 2, text: ' ' } as TextGlue,
    { type: 'box', width: 48, text: 'young' } as TextBox,
    { type: 'penalty', width: 6, cost: 50, flagged: true },
    { type: 'box', width: 22, text: 'est' } as TextBox,
    { type: 'glue', width: 6, stretch: 3, shrink: 2, text: ' ' } as TextGlue,
    { type: 'box', width: 29, text: 'was' } as TextBox,
    { type: 'glue', width: 6, stretch: 3, shrink: 2, text: ' ' } as TextGlue,
    { type: 'box', width: 16, text: 'so' } as TextBox,
    { type: 'glue', width: 6, stretch: 3, shrink: 2, text: ' ' } as TextGlue,
    { type: 'box', width: 37, text: 'beau' } as TextBox,
    { type: 'penalty', width: 6, cost: 50, flagged: true },
    { type: 'box', width: 12, text: 'ti' } as TextBox,
    { type: 'penalty', width: 6, cost: 50, flagged: true },
    { type: 'box', width: 21, text: 'ful' } as TextBox,
    { type: 'glue', width: 6, stretch: 3, shrink: 2, text: ' ' } as TextGlue,
    { type: 'box', width: 33, text: 'that' } as TextBox,
    { type: 'glue', width: 6, stretch: 3, shrink: 2, text: ' ' } as TextGlue,
    { type: 'box', width: 25, text: 'the' } as TextBox,
    { type: 'glue', width: 6, stretch: 3, shrink: 2, text: ' ' } as TextGlue,
    { type: 'box', width: 27, text: 'sun' } as TextBox,
    { type: 'glue', width: 6, stretch: 3, shrink: 2, text: ' ' } as TextGlue,
    { type: 'box', width: 12, text: 'it' } as TextBox,
    { type: 'penalty', width: 6, cost: 50, flagged: true },
    { type: 'box', width: 31, text: 'self,' } as TextBox,
    { type: 'glue', width: 6, stretch: 4, shrink: 2, text: ' ' } as TextGlue,
    { type: 'box', width: 46, text: 'which' } as TextBox,
    { type: 'glue', width: 6, stretch: 3, shrink: 2, text: ' ' } as TextGlue,
    { type: 'box', width: 26, text: 'has' } as TextBox,
    { type: 'glue', width: 6, stretch: 3, shrink: 2, text: ' ' } as TextGlue,
    { type: 'box', width: 33, text: 'seen' } as TextBox,
    { type: 'glue', width: 6, stretch: 3, shrink: 2, text: ' ' } as TextGlue,
    { type: 'box', width: 16, text: 'so' } as TextBox,
    { type: 'glue', width: 6, stretch: 3, shrink: 2, text: ' ' } as TextGlue,
    { type: 'box', width: 48, text: 'much,' } as TextBox,
    { type: 'glue', width: 6, stretch: 4, shrink: 2, text: ' ' } as TextGlue,
    { type: 'box', width: 29, text: 'was' } as TextBox,
    { type: 'glue', width: 6, stretch: 3, shrink: 2, text: ' ' } as TextGlue,
    { type: 'box', width: 42, text: 'aston' } as TextBox,
    { type: 'penalty', width: 6, cost: 50, flagged: true },
    { type: 'box', width: 40, text: 'ished' } as TextBox,
    { type: 'glue', width: 6, stretch: 3, shrink: 2, text: ' ' } as TextGlue,
    { type: 'box', width: 41, text: 'when' } as TextBox,
    { type: 'penalty', width: 6, cost: 50, flagged: true },
    { type: 'box', width: 32, text: 'ever' } as TextBox,
    { type: 'glue', width: 6, stretch: 3, shrink: 2, text: ' ' } as TextGlue,
    { type: 'box', width: 12, text: 'it' } as TextBox,
    { type: 'glue', width: 6, stretch: 3, shrink: 2, text: ' ' } as TextGlue,
    { type: 'box', width: 44, text: 'shone' } as TextBox,
    { type: 'glue', width: 6, stretch: 3, shrink: 2, text: ' ' } as TextGlue,
    { type: 'box', width: 15, text: 'in' } as TextBox,
    { type: 'glue', width: 6, stretch: 3, shrink: 2, text: ' ' } as TextGlue,
    { type: 'box', width: 25, text: 'her' } as TextBox,
    { type: 'glue', width: 6, stretch: 3, shrink: 2, text: ' ' } as TextGlue,
    { type: 'box', width: 36, text: 'face.' } as TextBox,
    { type: 'glue', width: 8, stretch: 6, shrink: 1, text: ' ' } as TextGlue,
    { type: 'box', width: 42, text: 'Close' } as TextBox,
    { type: 'glue', width: 6, stretch: 3, shrink: 2, text: ' ' } as TextGlue,
    { type: 'box', width: 20, text: 'by' } as TextBox,
    { type: 'glue', width: 6, stretch: 3, shrink: 2, text: ' ' } as TextGlue,
    { type: 'box', width: 25, text: 'the' } as TextBox,
    { type: 'glue', width: 6, stretch: 3, shrink: 2, text: ' ' } as TextGlue,
    { type: 'box', width: 46, text: "king's" } as TextBox,
    { type: 'glue', width: 6, stretch: 3, shrink: 2, text: ' ' } as TextGlue,
    { type: 'box', width: 44, text: 'castle' } as TextBox,
    { type: 'glue', width: 6, stretch: 3, shrink: 2, text: ' ' } as TextGlue,
    { type: 'box', width: 24, text: 'lay' } as TextBox,
    { type: 'glue', width: 6, stretch: 3, shrink: 2, text: ' ' } as TextGlue,
    { type: 'box', width: 9, text: 'a' } as TextBox,
    { type: 'glue', width: 6, stretch: 3, shrink: 2, text: ' ' } as TextGlue,
    { type: 'box', width: 40, text: 'great' } as TextBox,
    { type: 'glue', width: 6, stretch: 3, shrink: 2, text: ' ' } as TextGlue,
    { type: 'box', width: 36, text: 'dark' } as TextBox,
    { type: 'glue', width: 6, stretch: 3, shrink: 2, text: ' ' } as TextGlue,
    { type: 'box', width: 22, text: 'for' } as TextBox,
    { type: 'penalty', width: 6, cost: 50, flagged: true },
    { type: 'box', width: 27, text: 'est,' } as TextBox,
    { type: 'glue', width: 6, stretch: 4, shrink: 2, text: ' ' } as TextGlue,
    { type: 'box', width: 29, text: 'and' } as TextBox,
    { type: 'glue', width: 6, stretch: 3, shrink: 2, text: ' ' } as TextGlue,
    { type: 'box', width: 20, text: 'un' } as TextBox,
    { type: 'penalty', width: 6, cost: 50, flagged: true },
    { type: 'box', width: 25, text: 'der' } as TextBox,
    { type: 'glue', width: 6, stretch: 3, shrink: 2, text: ' ' } as TextGlue,
    { type: 'box', width: 19, text: 'an' } as TextBox,
    { type: 'glue', width: 6, stretch: 3, shrink: 2, text: ' ' } as TextGlue,
    { type: 'box', width: 24, text: 'old' } as TextBox,
    { type: 'glue', width: 6, stretch: 3, shrink: 2, text: ' ' } as TextGlue,
    { type: 'box', width: 39, text: 'lime-' } as TextBox,
    { type: 'penalty', width: 0, cost: 50, flagged: true },
    { type: 'box', width: 30, text: 'tree' } as TextBox,
    { type: 'glue', width: 6, stretch: 3, shrink: 2, text: ' ' } as TextGlue,
    { type: 'box', width: 15, text: 'in' } as TextBox,
    { type: 'glue', width: 6, stretch: 3, shrink: 2, text: ' ' } as TextGlue,
    { type: 'box', width: 25, text: 'the' } as TextBox,
    { type: 'glue', width: 6, stretch: 3, shrink: 2, text: ' ' } as TextGlue,
    { type: 'box', width: 22, text: 'for' } as TextBox,
    { type: 'penalty', width: 6, cost: 50, flagged: true },
    { type: 'box', width: 22, text: 'est' } as TextBox,
    { type: 'glue', width: 6, stretch: 3, shrink: 2, text: ' ' } as TextGlue,
    { type: 'box', width: 29, text: 'was' } as TextBox,
    { type: 'glue', width: 6, stretch: 3, shrink: 2, text: ' ' } as TextGlue,
    { type: 'box', width: 9, text: 'a' } as TextBox,
    { type: 'glue', width: 6, stretch: 3, shrink: 2, text: ' ' } as TextGlue,
    { type: 'box', width: 36, text: 'well,' } as TextBox,
    { type: 'glue', width: 6, stretch: 4, shrink: 2, text: ' ' } as TextGlue,
    { type: 'box', width: 29, text: 'and' } as TextBox,
    { type: 'glue', width: 6, stretch: 3, shrink: 2, text: ' ' } as TextGlue,
    { type: 'box', width: 41, text: 'when' } as TextBox,
    { type: 'glue', width: 6, stretch: 3, shrink: 2, text: ' ' } as TextGlue,
    { type: 'box', width: 25, text: 'the' } as TextBox,
    { type: 'glue', width: 6, stretch: 3, shrink: 2, text: ' ' } as TextGlue,
    { type: 'box', width: 29, text: 'day' } as TextBox,
    { type: 'glue', width: 6, stretch: 3, shrink: 2, text: ' ' } as TextGlue,
    { type: 'box', width: 29, text: 'was' } as TextBox,
    { type: 'glue', width: 6, stretch: 3, shrink: 2, text: ' ' } as TextGlue,
    { type: 'box', width: 34, text: 'very' } as TextBox,
    { type: 'glue', width: 6, stretch: 3, shrink: 2, text: ' ' } as TextGlue,
    { type: 'box', width: 49, text: 'warm,' } as TextBox,
    { type: 'glue', width: 6, stretch: 4, shrink: 2, text: ' ' } as TextGlue,
    { type: 'box', width: 25, text: 'the' } as TextBox,
    { type: 'glue', width: 6, stretch: 3, shrink: 2, text: ' ' } as TextGlue,
    { type: 'box', width: 46, text: "king's" } as TextBox,
    { type: 'glue', width: 6, stretch: 3, shrink: 2, text: ' ' } as TextGlue,
    { type: 'box', width: 38, text: 'child' } as TextBox,
    { type: 'glue', width: 6, stretch: 3, shrink: 2, text: ' ' } as TextGlue,
    { type: 'box', width: 38, text: 'went' } as TextBox,
    { type: 'glue', width: 6, stretch: 3, shrink: 2, text: ' ' } as TextGlue,
    { type: 'box', width: 26, text: 'out' } as TextBox,
    { type: 'glue', width: 6, stretch: 3, shrink: 2, text: ' ' } as TextGlue,
    { type: 'box', width: 31, text: 'into' } as TextBox,
    { type: 'glue', width: 6, stretch: 3, shrink: 2, text: ' ' } as TextGlue,
    { type: 'box', width: 25, text: 'the' } as TextBox,
    { type: 'glue', width: 6, stretch: 3, shrink: 2, text: ' ' } as TextGlue,
    { type: 'box', width: 22, text: 'for' } as TextBox,
    { type: 'penalty', width: 6, cost: 50, flagged: true },
    { type: 'box', width: 22, text: 'est' } as TextBox,
    { type: 'glue', width: 6, stretch: 3, shrink: 2, text: ' ' } as TextGlue,
    { type: 'box', width: 29, text: 'and' } as TextBox,
    { type: 'glue', width: 6, stretch: 3, shrink: 2, text: ' ' } as TextGlue,
    { type: 'box', width: 23, text: 'sat' } as TextBox,
    { type: 'glue', width: 6, stretch: 3, shrink: 2, text: ' ' } as TextGlue,
    { type: 'box', width: 42, text: 'down' } as TextBox,
    { type: 'glue', width: 6, stretch: 3, shrink: 2, text: ' ' } as TextGlue,
    { type: 'box', width: 20, text: 'by' } as TextBox,
    { type: 'glue', width: 6, stretch: 3, shrink: 2, text: ' ' } as TextGlue,
    { type: 'box', width: 25, text: 'the' } as TextBox,
    { type: 'glue', width: 6, stretch: 3, shrink: 2, text: ' ' } as TextGlue,
    { type: 'box', width: 30, text: 'side' } as TextBox,
    { type: 'glue', width: 6, stretch: 3, shrink: 2, text: ' ' } as TextGlue,
    { type: 'box', width: 15, text: 'of' } as TextBox,
    { type: 'glue', width: 6, stretch: 3, shrink: 2, text: ' ' } as TextGlue,
    { type: 'box', width: 25, text: 'the' } as TextBox,
    { type: 'glue', width: 6, stretch: 3, shrink: 2, text: ' ' } as TextGlue,
    { type: 'box', width: 31, text: 'cool' } as TextBox,
    { type: 'glue', width: 6, stretch: 3, shrink: 2, text: ' ' } as TextGlue,
    { type: 'box', width: 35, text: 'foun' } as TextBox,
    { type: 'penalty', width: 6, cost: 50, flagged: true },
    { type: 'box', width: 36, text: 'tain;' } as TextBox,
    { type: 'glue', width: 6, stretch: 4, shrink: 1, text: ' ' } as TextGlue,
    { type: 'box', width: 29, text: 'and' } as TextBox,
    { type: 'glue', width: 6, stretch: 3, shrink: 2, text: ' ' } as TextGlue,
    { type: 'box', width: 41, text: 'when' } as TextBox,
    { type: 'glue', width: 6, stretch: 3, shrink: 2, text: ' ' } as TextGlue,
    { type: 'box', width: 25, text: 'she' } as TextBox,
    { type: 'glue', width: 6, stretch: 3, shrink: 2, text: ' ' } as TextGlue,
    { type: 'box', width: 29, text: 'was' } as TextBox,
    { type: 'glue', width: 6, stretch: 3, shrink: 2, text: ' ' } as TextGlue,
    { type: 'box', width: 44, text: 'bored' } as TextBox,
    { type: 'glue', width: 6, stretch: 3, shrink: 2, text: ' ' } as TextGlue,
    { type: 'box', width: 25, text: 'she' } as TextBox,
    { type: 'glue', width: 6, stretch: 3, shrink: 2, text: ' ' } as TextGlue,
    { type: 'box', width: 35, text: 'took' } as TextBox,
    { type: 'glue', width: 6, stretch: 3, shrink: 2, text: ' ' } as TextGlue,
    { type: 'box', width: 9, text: 'a' } as TextBox,
    { type: 'glue', width: 6, stretch: 3, shrink: 2, text: ' ' } as TextGlue,
    { type: 'box', width: 51, text: 'golden' } as TextBox,
    { type: 'glue', width: 6, stretch: 3, shrink: 2, text: ' ' } as TextGlue,
    { type: 'box', width: 34, text: 'ball,' } as TextBox,
    { type: 'glue', width: 6, stretch: 4, shrink: 2, text: ' ' } as TextGlue,
    { type: 'box', width: 29, text: 'and' } as TextBox,
    { type: 'glue', width: 6, stretch: 3, shrink: 2, text: ' ' } as TextGlue,
    { type: 'box', width: 45, text: 'threw' } as TextBox,
    { type: 'glue', width: 6, stretch: 3, shrink: 2, text: ' ' } as TextGlue,
    { type: 'box', width: 12, text: 'it' } as TextBox,
    { type: 'glue', width: 6, stretch: 3, shrink: 2, text: ' ' } as TextGlue,
    { type: 'box', width: 20, text: 'up' } as TextBox,
    { type: 'glue', width: 6, stretch: 3, shrink: 2, text: ' ' } as TextGlue,
    { type: 'box', width: 19, text: 'on' } as TextBox,
    { type: 'glue', width: 6, stretch: 3, shrink: 2, text: ' ' } as TextGlue,
    { type: 'box', width: 34, text: 'high' } as TextBox,
    { type: 'glue', width: 6, stretch: 3, shrink: 2, text: ' ' } as TextGlue,
    { type: 'box', width: 29, text: 'and' } as TextBox,
    { type: 'glue', width: 6, stretch: 3, shrink: 2, text: ' ' } as TextGlue,
    { type: 'box', width: 53, text: 'caught' } as TextBox,
    { type: 'glue', width: 6, stretch: 3, shrink: 2, text: ' ' } as TextGlue,
    { type: 'box', width: 17, text: 'it;' } as TextBox,
    { type: 'glue', width: 6, stretch: 4, shrink: 1, text: ' ' } as TextGlue,
    { type: 'box', width: 29, text: 'and' } as TextBox,
    { type: 'glue', width: 6, stretch: 3, shrink: 2, text: ' ' } as TextGlue,
    { type: 'box', width: 29, text: 'this' } as TextBox,
    { type: 'glue', width: 6, stretch: 3, shrink: 2, text: ' ' } as TextGlue,
    { type: 'box', width: 29, text: 'ball' } as TextBox,
    { type: 'glue', width: 6, stretch: 3, shrink: 2, text: ' ' } as TextGlue,
    { type: 'box', width: 29, text: 'was' } as TextBox,
    { type: 'glue', width: 6, stretch: 3, shrink: 2, text: ' ' } as TextGlue,
    { type: 'box', width: 25, text: 'her' } as TextBox,
    { type: 'glue', width: 6, stretch: 3, shrink: 2, text: ' ' } as TextGlue,
    { type: 'box', width: 40, text: 'favor' } as TextBox,
    { type: 'penalty', width: 6, cost: 50, flagged: true },
    { type: 'box', width: 20, text: 'ite' } as TextBox,
    { type: 'glue', width: 6, stretch: 3, shrink: 2, text: ' ' } as TextGlue,
    { type: 'box', width: 34, text: 'play' } as TextBox,
    { type: 'penalty', width: 6, cost: 50, flagged: true },
    { type: 'box', width: 46, text: 'thing.' } as TextBox,
    { type: 'penalty', width: 0, cost: 1000, flagged: false },
    { type: 'glue', width: 0, stretch: 1000, shrink: 0, text: '' } as TextGlue,
    { type: 'penalty', width: 0, cost: -1000, flagged: true },
  ];
}

function frogPrinceCentered(): TextInputItem[] {
  // Built as described on pp. 94-95 of Digital Typography
  return [
    { type: 'glue', width: 0, stretch: 18, shrink: 0, text: '' } as TextGlue,
    { type: 'box', width: 16, text: 'In' } as TextBox,
    { type: 'glue', width: 0, stretch: 18, shrink: 0, text: ' ' } as TextGlue,
    { type: 'penalty', width: 0, cost: 0, flagged: false },
    { type: 'glue', width: 6, stretch: -36, shrink: 0, text: ' ' } as TextGlue,
    { type: 'box', width: 0, text: '' } as TextBox,
    { type: 'penalty', width: 0, cost: 1000, flagged: false },
    { type: 'glue', width: 0, stretch: 18, shrink: 0, text: ' ' } as TextGlue,
    { type: 'box', width: 42, text: 'olden' } as TextBox,
    { type: 'glue', width: 0, stretch: 18, shrink: 0, text: ' ' } as TextGlue,
    { type: 'penalty', width: 0, cost: 0, flagged: false },
    { type: 'glue', width: 6, stretch: -36, shrink: 0, text: ' ' } as TextGlue,
    { type: 'box', width: 0, text: '' } as TextBox,
    { type: 'penalty', width: 0, cost: 1000, flagged: false },
    { type: 'glue', width: 0, stretch: 18, shrink: 0, text: ' ' } as TextGlue,
    { type: 'box', width: 42, text: 'times' } as TextBox,
    { type: 'glue', width: 0, stretch: 18, shrink: 0, text: ' ' } as TextGlue,
    { type: 'penalty', width: 0, cost: 0, flagged: false },
    { type: 'glue', width: 6, stretch: -36, shrink: 0, text: ' ' } as TextGlue,
    { type: 'box', width: 0, text: '' } as TextBox,
    { type: 'penalty', width: 0, cost: 1000, flagged: false },
    { type: 'glue', width: 0, stretch: 18, shrink: 0, text: ' ' } as TextGlue,
    { type: 'box', width: 41, text: 'when' } as TextBox,
    { type: 'glue', width: 0, stretch: 18, shrink: 0, text: ' ' } as TextGlue,
    { type: 'penalty', width: 0, cost: 0, flagged: false },
    { type: 'glue', width: 6, stretch: -36, shrink: 0, text: ' ' } as TextGlue,
    { type: 'box', width: 0, text: '' } as TextBox,
    { type: 'penalty', width: 0, cost: 1000, flagged: false },
    { type: 'glue', width: 0, stretch: 18, shrink: 0, text: ' ' } as TextGlue,
    { type: 'box', width: 35, text: 'wish' } as TextBox,
    { type: 'penalty', width: 6, cost: 50, flagged: true },
    { type: 'box', width: 24, text: 'ing' } as TextBox,
    { type: 'glue', width: 0, stretch: 18, shrink: 0, text: ' ' } as TextGlue,
    { type: 'penalty', width: 0, cost: 0, flagged: false },
    { type: 'glue', width: 6, stretch: -36, shrink: 0, text: ' ' } as TextGlue,
    { type: 'box', width: 0, text: '' } as TextBox,
    { type: 'penalty', width: 0, cost: 1000, flagged: false },
    { type: 'glue', width: 0, stretch: 18, shrink: 0, text: ' ' } as TextGlue,
    { type: 'box', width: 29, text: 'still' } as TextBox,
    { type: 'glue', width: 0, stretch: 18, shrink: 0, text: ' ' } as TextGlue,
    { type: 'penalty', width: 0, cost: 0, flagged: false },
    { type: 'glue', width: 6, stretch: -36, shrink: 0, text: ' ' } as TextGlue,
    { type: 'box', width: 0, text: '' } as TextBox,
    { type: 'penalty', width: 0, cost: 1000, flagged: false },
    { type: 'glue', width: 0, stretch: 18, shrink: 0, text: ' ' } as TextGlue,
    { type: 'box', width: 51, text: 'helped' } as TextBox,
    { type: 'glue', width: 0, stretch: 18, shrink: 0, text: ' ' } as TextGlue,
    { type: 'penalty', width: 0, cost: 0, flagged: false },
    { type: 'glue', width: 6, stretch: -36, shrink: 0, text: ' ' } as TextGlue,
    { type: 'box', width: 0, text: '' } as TextBox,
    { type: 'penalty', width: 0, cost: 1000, flagged: false },
    { type: 'glue', width: 0, stretch: 18, shrink: 0, text: ' ' } as TextGlue,
    { type: 'box', width: 32, text: 'one,' } as TextBox,
    { type: 'glue', width: 0, stretch: 18, shrink: 0, text: ' ' } as TextGlue,
    { type: 'penalty', width: 0, cost: 0, flagged: false },
    { type: 'glue', width: 6, stretch: -36, shrink: 0, text: ' ' } as TextGlue,
    { type: 'box', width: 0, text: '' } as TextBox,
    { type: 'penalty', width: 0, cost: 1000, flagged: false },
    { type: 'glue', width: 0, stretch: 18, shrink: 0, text: ' ' } as TextGlue,
    { type: 'box', width: 40, text: 'there' } as TextBox,
    { type: 'glue', width: 0, stretch: 18, shrink: 0, text: ' ' } as TextGlue,
    { type: 'penalty', width: 0, cost: 0, flagged: false },
    { type: 'glue', width: 6, stretch: -36, shrink: 0, text: ' ' } as TextGlue,
    { type: 'box', width: 0, text: '' } as TextBox,
    { type: 'penalty', width: 0, cost: 1000, flagged: false },
    { type: 'glue', width: 0, stretch: 18, shrink: 0, text: ' ' } as TextGlue,
    { type: 'box', width: 37, text: 'lived' } as TextBox,
    { type: 'glue', width: 0, stretch: 18, shrink: 0, text: ' ' } as TextGlue,
    { type: 'penalty', width: 0, cost: 0, flagged: false },
    { type: 'glue', width: 6, stretch: -36, shrink: 0, text: ' ' } as TextGlue,
    { type: 'box', width: 0, text: '' } as TextBox,
    { type: 'penalty', width: 0, cost: 1000, flagged: false },
    { type: 'glue', width: 0, stretch: 18, shrink: 0, text: ' ' } as TextGlue,
    { type: 'box', width: 9, text: 'a' } as TextBox,
    { type: 'glue', width: 0, stretch: 18, shrink: 0, text: ' ' } as TextGlue,
    { type: 'penalty', width: 0, cost: 0, flagged: false },
    { type: 'glue', width: 6, stretch: -36, shrink: 0, text: ' ' } as TextGlue,
    { type: 'box', width: 0, text: '' } as TextBox,
    { type: 'penalty', width: 0, cost: 1000, flagged: false },
    { type: 'glue', width: 0, stretch: 18, shrink: 0, text: ' ' } as TextGlue,
    { type: 'box', width: 34, text: 'king' } as TextBox,
    { type: 'glue', width: 0, stretch: 18, shrink: 0, text: ' ' } as TextGlue,
    { type: 'penalty', width: 0, cost: 0, flagged: false },
    { type: 'glue', width: 6, stretch: -36, shrink: 0, text: ' ' } as TextGlue,
    { type: 'box', width: 0, text: '' } as TextBox,
    { type: 'penalty', width: 0, cost: 1000, flagged: false },
    { type: 'glue', width: 0, stretch: 18, shrink: 0, text: ' ' } as TextGlue,
    { type: 'box', width: 47, text: 'whose' } as TextBox,
    { type: 'glue', width: 0, stretch: 18, shrink: 0, text: ' ' } as TextGlue,
    { type: 'penalty', width: 0, cost: 0, flagged: false },
    { type: 'glue', width: 6, stretch: -36, shrink: 0, text: ' ' } as TextGlue,
    { type: 'box', width: 0, text: '' } as TextBox,
    { type: 'penalty', width: 0, cost: 1000, flagged: false },
    { type: 'glue', width: 0, stretch: 18, shrink: 0, text: ' ' } as TextGlue,
    { type: 'box', width: 48, text: 'daugh' } as TextBox,
    { type: 'penalty', width: 6, cost: 50, flagged: true },
    { type: 'box', width: 29, text: 'ters' } as TextBox,
    { type: 'glue', width: 0, stretch: 18, shrink: 0, text: ' ' } as TextGlue,
    { type: 'penalty', width: 0, cost: 0, flagged: false },
    { type: 'glue', width: 6, stretch: -36, shrink: 0, text: ' ' } as TextGlue,
    { type: 'box', width: 0, text: '' } as TextBox,
    { type: 'penalty', width: 0, cost: 1000, flagged: false },
    { type: 'glue', width: 0, stretch: 18, shrink: 0, text: ' ' } as TextGlue,
    { type: 'box', width: 36, text: 'were' } as TextBox,
    { type: 'glue', width: 0, stretch: 18, shrink: 0, text: ' ' } as TextGlue,
    { type: 'penalty', width: 0, cost: 0, flagged: false },
    { type: 'glue', width: 6, stretch: -36, shrink: 0, text: ' ' } as TextGlue,
    { type: 'box', width: 0, text: '' } as TextBox,
    { type: 'penalty', width: 0, cost: 1000, flagged: false },
    { type: 'glue', width: 0, stretch: 18, shrink: 0, text: ' ' } as TextGlue,
    { type: 'box', width: 19, text: 'all' } as TextBox,
    { type: 'glue', width: 0, stretch: 18, shrink: 0, text: ' ' } as TextGlue,
    { type: 'penalty', width: 0, cost: 0, flagged: false },
    { type: 'glue', width: 6, stretch: -36, shrink: 0, text: ' ' } as TextGlue,
    { type: 'box', width: 0, text: '' } as TextBox,
    { type: 'penalty', width: 0, cost: 1000, flagged: false },
    { type: 'glue', width: 0, stretch: 18, shrink: 0, text: ' ' } as TextGlue,
    { type: 'box', width: 37, text: 'beau' } as TextBox,
    { type: 'penalty', width: 6, cost: 50, flagged: true },
    { type: 'box', width: 12, text: 'ti' } as TextBox,
    { type: 'penalty', width: 6, cost: 50, flagged: true },
    { type: 'box', width: 26, text: 'ful;' } as TextBox,
    { type: 'glue', width: 0, stretch: 18, shrink: 0, text: ' ' } as TextGlue,
    { type: 'penalty', width: 0, cost: 0, flagged: false },
    { type: 'glue', width: 6, stretch: -36, shrink: 0, text: ' ' } as TextGlue,
    { type: 'box', width: 0, text: '' } as TextBox,
    { type: 'penalty', width: 0, cost: 1000, flagged: false },
    { type: 'glue', width: 0, stretch: 18, shrink: 0, text: ' ' } as TextGlue,
    { type: 'box', width: 29, text: 'and' } as TextBox,
    { type: 'glue', width: 0, stretch: 18, shrink: 0, text: ' ' } as TextGlue,
    { type: 'penalty', width: 0, cost: 0, flagged: false },
    { type: 'glue', width: 6, stretch: -36, shrink: 0, text: ' ' } as TextGlue,
    { type: 'box', width: 0, text: '' } as TextBox,
    { type: 'penalty', width: 0, cost: 1000, flagged: false },
    { type: 'glue', width: 0, stretch: 18, shrink: 0, text: ' ' } as TextGlue,
    { type: 'box', width: 25, text: 'the' } as TextBox,
    { type: 'glue', width: 0, stretch: 18, shrink: 0, text: ' ' } as TextGlue,
    { type: 'penalty', width: 0, cost: 0, flagged: false },
    { type: 'glue', width: 6, stretch: -36, shrink: 0, text: ' ' } as TextGlue,
    { type: 'box', width: 0, text: '' } as TextBox,
    { type: 'penalty', width: 0, cost: 1000, flagged: false },
    { type: 'glue', width: 0, stretch: 18, shrink: 0, text: ' ' } as TextGlue,
    { type: 'box', width: 48, text: 'young' } as TextBox,
    { type: 'penalty', width: 6, cost: 50, flagged: true },
    { type: 'box', width: 22, text: 'est' } as TextBox,
    { type: 'glue', width: 0, stretch: 18, shrink: 0, text: ' ' } as TextGlue,
    { type: 'penalty', width: 0, cost: 0, flagged: false },
    { type: 'glue', width: 6, stretch: -36, shrink: 0, text: ' ' } as TextGlue,
    { type: 'box', width: 0, text: '' } as TextBox,
    { type: 'penalty', width: 0, cost: 1000, flagged: false },
    { type: 'glue', width: 0, stretch: 18, shrink: 0, text: ' ' } as TextGlue,
    { type: 'box', width: 29, text: 'was' } as TextBox,
    { type: 'glue', width: 0, stretch: 18, shrink: 0, text: ' ' } as TextGlue,
    { type: 'penalty', width: 0, cost: 0, flagged: false },
    { type: 'glue', width: 6, stretch: -36, shrink: 0, text: ' ' } as TextGlue,
    { type: 'box', width: 0, text: '' } as TextBox,
    { type: 'penalty', width: 0, cost: 1000, flagged: false },
    { type: 'glue', width: 0, stretch: 18, shrink: 0, text: ' ' } as TextGlue,
    { type: 'box', width: 16, text: 'so' } as TextBox,
    { type: 'glue', width: 0, stretch: 18, shrink: 0, text: ' ' } as TextGlue,
    { type: 'penalty', width: 0, cost: 0, flagged: false },
    { type: 'glue', width: 6, stretch: -36, shrink: 0, text: ' ' } as TextGlue,
    { type: 'box', width: 0, text: '' } as TextBox,
    { type: 'penalty', width: 0, cost: 1000, flagged: false },
    { type: 'glue', width: 0, stretch: 18, shrink: 0, text: ' ' } as TextGlue,
    { type: 'box', width: 37, text: 'beau' } as TextBox,
    { type: 'penalty', width: 6, cost: 50, flagged: true },
    { type: 'box', width: 12, text: 'ti' } as TextBox,
    { type: 'penalty', width: 6, cost: 50, flagged: true },
    { type: 'box', width: 21, text: 'ful' } as TextBox,
    { type: 'glue', width: 0, stretch: 18, shrink: 0, text: ' ' } as TextGlue,
    { type: 'penalty', width: 0, cost: 0, flagged: false },
    { type: 'glue', width: 6, stretch: -36, shrink: 0, text: ' ' } as TextGlue,
    { type: 'box', width: 0, text: '' } as TextBox,
    { type: 'penalty', width: 0, cost: 1000, flagged: false },
    { type: 'glue', width: 0, stretch: 18, shrink: 0, text: ' ' } as TextGlue,
    { type: 'box', width: 33, text: 'that' } as TextBox,
    { type: 'glue', width: 0, stretch: 18, shrink: 0, text: ' ' } as TextGlue,
    { type: 'penalty', width: 0, cost: 0, flagged: false },
    { type: 'glue', width: 6, stretch: -36, shrink: 0, text: ' ' } as TextGlue,
    { type: 'box', width: 0, text: '' } as TextBox,
    { type: 'penalty', width: 0, cost: 1000, flagged: false },
    { type: 'glue', width: 0, stretch: 18, shrink: 0, text: ' ' } as TextGlue,
    { type: 'box', width: 25, text: 'the' } as TextBox,
    { type: 'glue', width: 0, stretch: 18, shrink: 0, text: ' ' } as TextGlue,
    { type: 'penalty', width: 0, cost: 0, flagged: false },
    { type: 'glue', width: 6, stretch: -36, shrink: 0, text: ' ' } as TextGlue,
    { type: 'box', width: 0, text: '' } as TextBox,
    { type: 'penalty', width: 0, cost: 1000, flagged: false },
    { type: 'glue', width: 0, stretch: 18, shrink: 0, text: ' ' } as TextGlue,
    { type: 'box', width: 27, text: 'sun' } as TextBox,
    { type: 'glue', width: 0, stretch: 18, shrink: 0, text: ' ' } as TextGlue,
    { type: 'penalty', width: 0, cost: 0, flagged: false },
    { type: 'glue', width: 6, stretch: -36, shrink: 0, text: ' ' } as TextGlue,
    { type: 'box', width: 0, text: '' } as TextBox,
    { type: 'penalty', width: 0, cost: 1000, flagged: false },
    { type: 'glue', width: 0, stretch: 18, shrink: 0, text: ' ' } as TextGlue,
    { type: 'box', width: 12, text: 'it' } as TextBox,
    { type: 'penalty', width: 6, cost: 50, flagged: true },
    { type: 'box', width: 31, text: 'self,' } as TextBox,
    { type: 'glue', width: 0, stretch: 18, shrink: 0, text: ' ' } as TextGlue,
    { type: 'penalty', width: 0, cost: 0, flagged: false },
    { type: 'glue', width: 6, stretch: -36, shrink: 0, text: ' ' } as TextGlue,
    { type: 'box', width: 0, text: '' } as TextBox,
    { type: 'penalty', width: 0, cost: 1000, flagged: false },
    { type: 'glue', width: 0, stretch: 18, shrink: 0, text: ' ' } as TextGlue,
    { type: 'box', width: 46, text: 'which' } as TextBox,
    { type: 'glue', width: 0, stretch: 18, shrink: 0, text: ' ' } as TextGlue,
    { type: 'penalty', width: 0, cost: 0, flagged: false },
    { type: 'glue', width: 6, stretch: -36, shrink: 0, text: ' ' } as TextGlue,
    { type: 'box', width: 0, text: '' } as TextBox,
    { type: 'penalty', width: 0, cost: 1000, flagged: false },
    { type: 'glue', width: 0, stretch: 18, shrink: 0, text: ' ' } as TextGlue,
    { type: 'box', width: 26, text: 'has' } as TextBox,
    { type: 'glue', width: 0, stretch: 18, shrink: 0, text: ' ' } as TextGlue,
    { type: 'penalty', width: 0, cost: 0, flagged: false },
    { type: 'glue', width: 6, stretch: -36, shrink: 0, text: ' ' } as TextGlue,
    { type: 'box', width: 0, text: '' } as TextBox,
    { type: 'penalty', width: 0, cost: 1000, flagged: false },
    { type: 'glue', width: 0, stretch: 18, shrink: 0, text: ' ' } as TextGlue,
    { type: 'box', width: 33, text: 'seen' } as TextBox,
    { type: 'glue', width: 0, stretch: 18, shrink: 0, text: ' ' } as TextGlue,
    { type: 'penalty', width: 0, cost: 0, flagged: false },
    { type: 'glue', width: 6, stretch: -36, shrink: 0, text: ' ' } as TextGlue,
    { type: 'box', width: 0, text: '' } as TextBox,
    { type: 'penalty', width: 0, cost: 1000, flagged: false },
    { type: 'glue', width: 0, stretch: 18, shrink: 0, text: ' ' } as TextGlue,
    { type: 'box', width: 16, text: 'so' } as TextBox,
    { type: 'glue', width: 0, stretch: 18, shrink: 0, text: ' ' } as TextGlue,
    { type: 'penalty', width: 0, cost: 0, flagged: false },
    { type: 'glue', width: 6, stretch: -36, shrink: 0, text: ' ' } as TextGlue,
    { type: 'box', width: 0, text: '' } as TextBox,
    { type: 'penalty', width: 0, cost: 1000, flagged: false },
    { type: 'glue', width: 0, stretch: 18, shrink: 0, text: ' ' } as TextGlue,
    { type: 'box', width: 48, text: 'much,' } as TextBox,
    { type: 'glue', width: 0, stretch: 18, shrink: 0, text: ' ' } as TextGlue,
    { type: 'penalty', width: 0, cost: 0, flagged: false },
    { type: 'glue', width: 6, stretch: -36, shrink: 0, text: ' ' } as TextGlue,
    { type: 'box', width: 0, text: '' } as TextBox,
    { type: 'penalty', width: 0, cost: 1000, flagged: false },
    { type: 'glue', width: 0, stretch: 18, shrink: 0, text: ' ' } as TextGlue,
    { type: 'box', width: 29, text: 'was' } as TextBox,
    { type: 'glue', width: 0, stretch: 18, shrink: 0, text: ' ' } as TextGlue,
    { type: 'penalty', width: 0, cost: 0, flagged: false },
    { type: 'glue', width: 6, stretch: -36, shrink: 0, text: ' ' } as TextGlue,
    { type: 'box', width: 0, text: '' } as TextBox,
    { type: 'penalty', width: 0, cost: 1000, flagged: false },
    { type: 'glue', width: 0, stretch: 18, shrink: 0, text: ' ' } as TextGlue,
    { type: 'box', width: 42, text: 'aston' } as TextBox,
    { type: 'penalty', width: 6, cost: 50, flagged: true },
    { type: 'box', width: 40, text: 'ished' } as TextBox,
    { type: 'glue', width: 0, stretch: 18, shrink: 0, text: ' ' } as TextGlue,
    { type: 'penalty', width: 0, cost: 0, flagged: false },
    { type: 'glue', width: 6, stretch: -36, shrink: 0, text: ' ' } as TextGlue,
    { type: 'box', width: 0, text: '' } as TextBox,
    { type: 'penalty', width: 0, cost: 1000, flagged: false },
    { type: 'glue', width: 0, stretch: 18, shrink: 0, text: ' ' } as TextGlue,
    { type: 'box', width: 41, text: 'when' } as TextBox,
    { type: 'penalty', width: 6, cost: 50, flagged: true },
    { type: 'box', width: 32, text: 'ever' } as TextBox,
    { type: 'glue', width: 0, stretch: 18, shrink: 0, text: ' ' } as TextGlue,
    { type: 'penalty', width: 0, cost: 0, flagged: false },
    { type: 'glue', width: 6, stretch: -36, shrink: 0, text: ' ' } as TextGlue,
    { type: 'box', width: 0, text: '' } as TextBox,
    { type: 'penalty', width: 0, cost: 1000, flagged: false },
    { type: 'glue', width: 0, stretch: 18, shrink: 0, text: ' ' } as TextGlue,
    { type: 'box', width: 12, text: 'it' } as TextBox,
    { type: 'glue', width: 0, stretch: 18, shrink: 0, text: ' ' } as TextGlue,
    { type: 'penalty', width: 0, cost: 0, flagged: false },
    { type: 'glue', width: 6, stretch: -36, shrink: 0, text: ' ' } as TextGlue,
    { type: 'box', width: 0, text: '' } as TextBox,
    { type: 'penalty', width: 0, cost: 1000, flagged: false },
    { type: 'glue', width: 0, stretch: 18, shrink: 0, text: ' ' } as TextGlue,
    { type: 'box', width: 44, text: 'shone' } as TextBox,
    { type: 'glue', width: 0, stretch: 18, shrink: 0, text: ' ' } as TextGlue,
    { type: 'penalty', width: 0, cost: 0, flagged: false },
    { type: 'glue', width: 6, stretch: -36, shrink: 0, text: ' ' } as TextGlue,
    { type: 'box', width: 0, text: '' } as TextBox,
    { type: 'penalty', width: 0, cost: 1000, flagged: false },
    { type: 'glue', width: 0, stretch: 18, shrink: 0, text: ' ' } as TextGlue,
    { type: 'box', width: 15, text: 'in' } as TextBox,
    { type: 'glue', width: 0, stretch: 18, shrink: 0, text: ' ' } as TextGlue,
    { type: 'penalty', width: 0, cost: 0, flagged: false },
    { type: 'glue', width: 6, stretch: -36, shrink: 0, text: ' ' } as TextGlue,
    { type: 'box', width: 0, text: '' } as TextBox,
    { type: 'penalty', width: 0, cost: 1000, flagged: false },
    { type: 'glue', width: 0, stretch: 18, shrink: 0, text: ' ' } as TextGlue,
    { type: 'box', width: 25, text: 'her' } as TextBox,
    { type: 'glue', width: 0, stretch: 18, shrink: 0, text: ' ' } as TextGlue,
    { type: 'penalty', width: 0, cost: 0, flagged: false },
    { type: 'glue', width: 6, stretch: -36, shrink: 0, text: ' ' } as TextGlue,
    { type: 'box', width: 0, text: '' } as TextBox,
    { type: 'penalty', width: 0, cost: 1000, flagged: false },
    { type: 'glue', width: 0, stretch: 18, shrink: 0, text: ' ' } as TextGlue,
    { type: 'box', width: 36, text: 'face.' } as TextBox,
    { type: 'glue', width: 0, stretch: 18, shrink: 0, text: ' ' } as TextGlue,
    { type: 'penalty', width: 0, cost: 0, flagged: false },
    { type: 'glue', width: 6, stretch: -36, shrink: 0, text: ' ' } as TextGlue,
    { type: 'box', width: 0, text: '' } as TextBox,
    { type: 'penalty', width: 0, cost: 1000, flagged: false },
    { type: 'glue', width: 0, stretch: 18, shrink: 0, text: ' ' } as TextGlue,
    { type: 'box', width: 42, text: 'Close' } as TextBox,
    { type: 'glue', width: 0, stretch: 18, shrink: 0, text: ' ' } as TextGlue,
    { type: 'penalty', width: 0, cost: 0, flagged: false },
    { type: 'glue', width: 6, stretch: -36, shrink: 0, text: ' ' } as TextGlue,
    { type: 'box', width: 0, text: '' } as TextBox,
    { type: 'penalty', width: 0, cost: 1000, flagged: false },
    { type: 'glue', width: 0, stretch: 18, shrink: 0, text: ' ' } as TextGlue,
    { type: 'box', width: 20, text: 'by' } as TextBox,
    { type: 'glue', width: 0, stretch: 18, shrink: 0, text: ' ' } as TextGlue,
    { type: 'penalty', width: 0, cost: 0, flagged: false },
    { type: 'glue', width: 6, stretch: -36, shrink: 0, text: ' ' } as TextGlue,
    { type: 'box', width: 0, text: '' } as TextBox,
    { type: 'penalty', width: 0, cost: 1000, flagged: false },
    { type: 'glue', width: 0, stretch: 18, shrink: 0, text: ' ' } as TextGlue,
    { type: 'box', width: 25, text: 'the' } as TextBox,
    { type: 'glue', width: 0, stretch: 18, shrink: 0, text: ' ' } as TextGlue,
    { type: 'penalty', width: 0, cost: 0, flagged: false },
    { type: 'glue', width: 6, stretch: -36, shrink: 0, text: ' ' } as TextGlue,
    { type: 'box', width: 0, text: '' } as TextBox,
    { type: 'penalty', width: 0, cost: 1000, flagged: false },
    { type: 'glue', width: 0, stretch: 18, shrink: 0, text: ' ' } as TextGlue,
    { type: 'box', width: 46, text: "king's" } as TextBox,
    { type: 'glue', width: 0, stretch: 18, shrink: 0, text: ' ' } as TextGlue,
    { type: 'penalty', width: 0, cost: 0, flagged: false },
    { type: 'glue', width: 6, stretch: -36, shrink: 0, text: ' ' } as TextGlue,
    { type: 'box', width: 0, text: '' } as TextBox,
    { type: 'penalty', width: 0, cost: 1000, flagged: false },
    { type: 'glue', width: 0, stretch: 18, shrink: 0, text: ' ' } as TextGlue,
    { type: 'box', width: 44, text: 'castle' } as TextBox,
    { type: 'glue', width: 0, stretch: 18, shrink: 0, text: ' ' } as TextGlue,
    { type: 'penalty', width: 0, cost: 0, flagged: false },
    { type: 'glue', width: 6, stretch: -36, shrink: 0, text: ' ' } as TextGlue,
    { type: 'box', width: 0, text: '' } as TextBox,
    { type: 'penalty', width: 0, cost: 1000, flagged: false },
    { type: 'glue', width: 0, stretch: 18, shrink: 0, text: ' ' } as TextGlue,
    { type: 'box', width: 24, text: 'lay' } as TextBox,
    { type: 'glue', width: 0, stretch: 18, shrink: 0, text: ' ' } as TextGlue,
    { type: 'penalty', width: 0, cost: 0, flagged: false },
    { type: 'glue', width: 6, stretch: -36, shrink: 0, text: ' ' } as TextGlue,
    { type: 'box', width: 0, text: '' } as TextBox,
    { type: 'penalty', width: 0, cost: 1000, flagged: false },
    { type: 'glue', width: 0, stretch: 18, shrink: 0, text: ' ' } as TextGlue,
    { type: 'box', width: 9, text: 'a' } as TextBox,
    { type: 'glue', width: 0, stretch: 18, shrink: 0, text: ' ' } as TextGlue,
    { type: 'penalty', width: 0, cost: 0, flagged: false },
    { type: 'glue', width: 6, stretch: -36, shrink: 0, text: ' ' } as TextGlue,
    { type: 'box', width: 0, text: '' } as TextBox,
    { type: 'penalty', width: 0, cost: 1000, flagged: false },
    { type: 'glue', width: 0, stretch: 18, shrink: 0, text: ' ' } as TextGlue,
    { type: 'box', width: 40, text: 'great' } as TextBox,
    { type: 'glue', width: 0, stretch: 18, shrink: 0, text: ' ' } as TextGlue,
    { type: 'penalty', width: 0, cost: 0, flagged: false },
    { type: 'glue', width: 6, stretch: -36, shrink: 0, text: ' ' } as TextGlue,
    { type: 'box', width: 0, text: '' } as TextBox,
    { type: 'penalty', width: 0, cost: 1000, flagged: false },
    { type: 'glue', width: 0, stretch: 18, shrink: 0, text: ' ' } as TextGlue,
    { type: 'box', width: 36, text: 'dark' } as TextBox,
    { type: 'glue', width: 0, stretch: 18, shrink: 0, text: ' ' } as TextGlue,
    { type: 'penalty', width: 0, cost: 0, flagged: false },
    { type: 'glue', width: 6, stretch: -36, shrink: 0, text: ' ' } as TextGlue,
    { type: 'box', width: 0, text: '' } as TextBox,
    { type: 'penalty', width: 0, cost: 1000, flagged: false },
    { type: 'glue', width: 0, stretch: 18, shrink: 0, text: ' ' } as TextGlue,
    { type: 'box', width: 22, text: 'for' } as TextBox,
    { type: 'penalty', width: 6, cost: 50, flagged: true },
    { type: 'box', width: 27, text: 'est,' } as TextBox,
    { type: 'glue', width: 0, stretch: 18, shrink: 0, text: ' ' } as TextGlue,
    { type: 'penalty', width: 0, cost: 0, flagged: false },
    { type: 'glue', width: 6, stretch: -36, shrink: 0, text: ' ' } as TextGlue,
    { type: 'box', width: 0, text: '' } as TextBox,
    { type: 'penalty', width: 0, cost: 1000, flagged: false },
    { type: 'glue', width: 0, stretch: 18, shrink: 0, text: ' ' } as TextGlue,
    { type: 'box', width: 29, text: 'and' } as TextBox,
    { type: 'glue', width: 0, stretch: 18, shrink: 0, text: ' ' } as TextGlue,
    { type: 'penalty', width: 0, cost: 0, flagged: false },
    { type: 'glue', width: 6, stretch: -36, shrink: 0, text: ' ' } as TextGlue,
    { type: 'box', width: 0, text: '' } as TextBox,
    { type: 'penalty', width: 0, cost: 1000, flagged: false },
    { type: 'glue', width: 0, stretch: 18, shrink: 0, text: ' ' } as TextGlue,
    { type: 'box', width: 20, text: 'un' } as TextBox,
    { type: 'penalty', width: 6, cost: 50, flagged: true },
    { type: 'box', width: 25, text: 'der' } as TextBox,
    { type: 'glue', width: 0, stretch: 18, shrink: 0, text: ' ' } as TextGlue,
    { type: 'penalty', width: 0, cost: 0, flagged: false },
    { type: 'glue', width: 6, stretch: -36, shrink: 0, text: ' ' } as TextGlue,
    { type: 'box', width: 0, text: '' } as TextBox,
    { type: 'penalty', width: 0, cost: 1000, flagged: false },
    { type: 'glue', width: 0, stretch: 18, shrink: 0, text: ' ' } as TextGlue,
    { type: 'box', width: 19, text: 'an' } as TextBox,
    { type: 'glue', width: 0, stretch: 18, shrink: 0, text: ' ' } as TextGlue,
    { type: 'penalty', width: 0, cost: 0, flagged: false },
    { type: 'glue', width: 6, stretch: -36, shrink: 0, text: ' ' } as TextGlue,
    { type: 'box', width: 0, text: '' } as TextBox,
    { type: 'penalty', width: 0, cost: 1000, flagged: false },
    { type: 'glue', width: 0, stretch: 18, shrink: 0, text: ' ' } as TextGlue,
    { type: 'box', width: 24, text: 'old' } as TextBox,
    { type: 'glue', width: 0, stretch: 18, shrink: 0, text: ' ' } as TextGlue,
    { type: 'penalty', width: 0, cost: 0, flagged: false },
    { type: 'glue', width: 6, stretch: -36, shrink: 0, text: ' ' } as TextGlue,
    { type: 'box', width: 0, text: '' } as TextBox,
    { type: 'penalty', width: 0, cost: 1000, flagged: false },
    { type: 'glue', width: 0, stretch: 18, shrink: 0, text: ' ' } as TextGlue,
    { type: 'box', width: 39, text: 'lime-' } as TextBox,
    { type: 'penalty', width: 0, cost: 50, flagged: true },
    { type: 'box', width: 30, text: 'tree' } as TextBox,
    { type: 'glue', width: 0, stretch: 18, shrink: 0, text: ' ' } as TextGlue,
    { type: 'penalty', width: 0, cost: 0, flagged: false },
    { type: 'glue', width: 6, stretch: -36, shrink: 0, text: ' ' } as TextGlue,
    { type: 'box', width: 0, text: '' } as TextBox,
    { type: 'penalty', width: 0, cost: 1000, flagged: false },
    { type: 'glue', width: 0, stretch: 18, shrink: 0, text: ' ' } as TextGlue,
    { type: 'box', width: 15, text: 'in' } as TextBox,
    { type: 'glue', width: 0, stretch: 18, shrink: 0, text: ' ' } as TextGlue,
    { type: 'penalty', width: 0, cost: 0, flagged: false },
    { type: 'glue', width: 6, stretch: -36, shrink: 0, text: ' ' } as TextGlue,
    { type: 'box', width: 0, text: '' } as TextBox,
    { type: 'penalty', width: 0, cost: 1000, flagged: false },
    { type: 'glue', width: 0, stretch: 18, shrink: 0, text: ' ' } as TextGlue,
    { type: 'box', width: 25, text: 'the' } as TextBox,
    { type: 'glue', width: 0, stretch: 18, shrink: 0, text: ' ' } as TextGlue,
    { type: 'penalty', width: 0, cost: 0, flagged: false },
    { type: 'glue', width: 6, stretch: -36, shrink: 0, text: ' ' } as TextGlue,
    { type: 'box', width: 0, text: '' } as TextBox,
    { type: 'penalty', width: 0, cost: 1000, flagged: false },
    { type: 'glue', width: 0, stretch: 18, shrink: 0, text: ' ' } as TextGlue,
    { type: 'box', width: 22, text: 'for' } as TextBox,
    { type: 'penalty', width: 6, cost: 50, flagged: true },
    { type: 'box', width: 22, text: 'est' } as TextBox,
    { type: 'glue', width: 0, stretch: 18, shrink: 0, text: ' ' } as TextGlue,
    { type: 'penalty', width: 0, cost: 0, flagged: false },
    { type: 'glue', width: 6, stretch: -36, shrink: 0, text: ' ' } as TextGlue,
    { type: 'box', width: 0, text: '' } as TextBox,
    { type: 'penalty', width: 0, cost: 1000, flagged: false },
    { type: 'glue', width: 0, stretch: 18, shrink: 0, text: ' ' } as TextGlue,
    { type: 'box', width: 29, text: 'was' } as TextBox,
    { type: 'glue', width: 0, stretch: 18, shrink: 0, text: ' ' } as TextGlue,
    { type: 'penalty', width: 0, cost: 0, flagged: false },
    { type: 'glue', width: 6, stretch: -36, shrink: 0, text: ' ' } as TextGlue,
    { type: 'box', width: 0, text: '' } as TextBox,
    { type: 'penalty', width: 0, cost: 1000, flagged: false },
    { type: 'glue', width: 0, stretch: 18, shrink: 0, text: ' ' } as TextGlue,
    { type: 'box', width: 9, text: 'a' } as TextBox,
    { type: 'glue', width: 0, stretch: 18, shrink: 0, text: ' ' } as TextGlue,
    { type: 'penalty', width: 0, cost: 0, flagged: false },
    { type: 'glue', width: 6, stretch: -36, shrink: 0, text: ' ' } as TextGlue,
    { type: 'box', width: 0, text: '' } as TextBox,
    { type: 'penalty', width: 0, cost: 1000, flagged: false },
    { type: 'glue', width: 0, stretch: 18, shrink: 0, text: ' ' } as TextGlue,
    { type: 'box', width: 36, text: 'well,' } as TextBox,
    { type: 'glue', width: 0, stretch: 18, shrink: 0, text: ' ' } as TextGlue,
    { type: 'penalty', width: 0, cost: 0, flagged: false },
    { type: 'glue', width: 6, stretch: -36, shrink: 0, text: ' ' } as TextGlue,
    { type: 'box', width: 0, text: '' } as TextBox,
    { type: 'penalty', width: 0, cost: 1000, flagged: false },
    { type: 'glue', width: 0, stretch: 18, shrink: 0, text: ' ' } as TextGlue,
    { type: 'box', width: 29, text: 'and' } as TextBox,
    { type: 'glue', width: 0, stretch: 18, shrink: 0, text: ' ' } as TextGlue,
    { type: 'penalty', width: 0, cost: 0, flagged: false },
    { type: 'glue', width: 6, stretch: -36, shrink: 0, text: ' ' } as TextGlue,
    { type: 'box', width: 0, text: '' } as TextBox,
    { type: 'penalty', width: 0, cost: 1000, flagged: false },
    { type: 'glue', width: 0, stretch: 18, shrink: 0, text: ' ' } as TextGlue,
    { type: 'box', width: 41, text: 'when' } as TextBox,
    { type: 'glue', width: 0, stretch: 18, shrink: 0, text: ' ' } as TextGlue,
    { type: 'penalty', width: 0, cost: 0, flagged: false },
    { type: 'glue', width: 6, stretch: -36, shrink: 0, text: ' ' } as TextGlue,
    { type: 'box', width: 0, text: '' } as TextBox,
    { type: 'penalty', width: 0, cost: 1000, flagged: false },
    { type: 'glue', width: 0, stretch: 18, shrink: 0, text: ' ' } as TextGlue,
    { type: 'box', width: 25, text: 'the' } as TextBox,
    { type: 'glue', width: 0, stretch: 18, shrink: 0, text: ' ' } as TextGlue,
    { type: 'penalty', width: 0, cost: 0, flagged: false },
    { type: 'glue', width: 6, stretch: -36, shrink: 0, text: ' ' } as TextGlue,
    { type: 'box', width: 0, text: '' } as TextBox,
    { type: 'penalty', width: 0, cost: 1000, flagged: false },
    { type: 'glue', width: 0, stretch: 18, shrink: 0, text: ' ' } as TextGlue,
    { type: 'box', width: 29, text: 'day' } as TextBox,
    { type: 'glue', width: 0, stretch: 18, shrink: 0, text: ' ' } as TextGlue,
    { type: 'penalty', width: 0, cost: 0, flagged: false },
    { type: 'glue', width: 6, stretch: -36, shrink: 0, text: ' ' } as TextGlue,
    { type: 'box', width: 0, text: '' } as TextBox,
    { type: 'penalty', width: 0, cost: 1000, flagged: false },
    { type: 'glue', width: 0, stretch: 18, shrink: 0, text: ' ' } as TextGlue,
    { type: 'box', width: 29, text: 'was' } as TextBox,
    { type: 'glue', width: 0, stretch: 18, shrink: 0, text: ' ' } as TextGlue,
    { type: 'penalty', width: 0, cost: 0, flagged: false },
    { type: 'glue', width: 6, stretch: -36, shrink: 0, text: ' ' } as TextGlue,
    { type: 'box', width: 0, text: '' } as TextBox,
    { type: 'penalty', width: 0, cost: 1000, flagged: false },
    { type: 'glue', width: 0, stretch: 18, shrink: 0, text: ' ' } as TextGlue,
    { type: 'box', width: 34, text: 'very' } as TextBox,
    { type: 'glue', width: 0, stretch: 18, shrink: 0, text: ' ' } as TextGlue,
    { type: 'penalty', width: 0, cost: 0, flagged: false },
    { type: 'glue', width: 6, stretch: -36, shrink: 0, text: ' ' } as TextGlue,
    { type: 'box', width: 0, text: '' } as TextBox,
    { type: 'penalty', width: 0, cost: 1000, flagged: false },
    { type: 'glue', width: 0, stretch: 18, shrink: 0, text: ' ' } as TextGlue,
    { type: 'box', width: 49, text: 'warm,' } as TextBox,
    { type: 'glue', width: 0, stretch: 18, shrink: 0, text: ' ' } as TextGlue,
    { type: 'penalty', width: 0, cost: 0, flagged: false },
    { type: 'glue', width: 6, stretch: -36, shrink: 0, text: ' ' } as TextGlue,
    { type: 'box', width: 0, text: '' } as TextBox,
    { type: 'penalty', width: 0, cost: 1000, flagged: false },
    { type: 'glue', width: 0, stretch: 18, shrink: 0, text: ' ' } as TextGlue,
    { type: 'box', width: 25, text: 'the' } as TextBox,
    { type: 'glue', width: 0, stretch: 18, shrink: 0, text: ' ' } as TextGlue,
    { type: 'penalty', width: 0, cost: 0, flagged: false },
    { type: 'glue', width: 6, stretch: -36, shrink: 0, text: ' ' } as TextGlue,
    { type: 'box', width: 0, text: '' } as TextBox,
    { type: 'penalty', width: 0, cost: 1000, flagged: false },
    { type: 'glue', width: 0, stretch: 18, shrink: 0, text: ' ' } as TextGlue,
    { type: 'box', width: 46, text: "king's" } as TextBox,
    { type: 'glue', width: 0, stretch: 18, shrink: 0, text: ' ' } as TextGlue,
    { type: 'penalty', width: 0, cost: 0, flagged: false },
    { type: 'glue', width: 6, stretch: -36, shrink: 0, text: ' ' } as TextGlue,
    { type: 'box', width: 0, text: '' } as TextBox,
    { type: 'penalty', width: 0, cost: 1000, flagged: false },
    { type: 'glue', width: 0, stretch: 18, shrink: 0, text: ' ' } as TextGlue,
    { type: 'box', width: 38, text: 'child' } as TextBox,
    { type: 'glue', width: 0, stretch: 18, shrink: 0, text: ' ' } as TextGlue,
    { type: 'penalty', width: 0, cost: 0, flagged: false },
    { type: 'glue', width: 6, stretch: -36, shrink: 0, text: ' ' } as TextGlue,
    { type: 'box', width: 0, text: '' } as TextBox,
    { type: 'penalty', width: 0, cost: 1000, flagged: false },
    { type: 'glue', width: 0, stretch: 18, shrink: 0, text: ' ' } as TextGlue,
    { type: 'box', width: 38, text: 'went' } as TextBox,
    { type: 'glue', width: 0, stretch: 18, shrink: 0, text: ' ' } as TextGlue,
    { type: 'penalty', width: 0, cost: 0, flagged: false },
    { type: 'glue', width: 6, stretch: -36, shrink: 0, text: ' ' } as TextGlue,
    { type: 'box', width: 0, text: '' } as TextBox,
    { type: 'penalty', width: 0, cost: 1000, flagged: false },
    { type: 'glue', width: 0, stretch: 18, shrink: 0, text: ' ' } as TextGlue,
    { type: 'box', width: 26, text: 'out' } as TextBox,
    { type: 'glue', width: 0, stretch: 18, shrink: 0, text: ' ' } as TextGlue,
    { type: 'penalty', width: 0, cost: 0, flagged: false },
    { type: 'glue', width: 6, stretch: -36, shrink: 0, text: ' ' } as TextGlue,
    { type: 'box', width: 0, text: '' } as TextBox,
    { type: 'penalty', width: 0, cost: 1000, flagged: false },
    { type: 'glue', width: 0, stretch: 18, shrink: 0, text: ' ' } as TextGlue,
    { type: 'box', width: 31, text: 'into' } as TextBox,
    { type: 'glue', width: 0, stretch: 18, shrink: 0, text: ' ' } as TextGlue,
    { type: 'penalty', width: 0, cost: 0, flagged: false },
    { type: 'glue', width: 6, stretch: -36, shrink: 0, text: ' ' } as TextGlue,
    { type: 'box', width: 0, text: '' } as TextBox,
    { type: 'penalty', width: 0, cost: 1000, flagged: false },
    { type: 'glue', width: 0, stretch: 18, shrink: 0, text: ' ' } as TextGlue,
    { type: 'box', width: 25, text: 'the' } as TextBox,
    { type: 'glue', width: 0, stretch: 18, shrink: 0, text: ' ' } as TextGlue,
    { type: 'penalty', width: 0, cost: 0, flagged: false },
    { type: 'glue', width: 6, stretch: -36, shrink: 0, text: ' ' } as TextGlue,
    { type: 'box', width: 0, text: '' } as TextBox,
    { type: 'penalty', width: 0, cost: 1000, flagged: false },
    { type: 'glue', width: 0, stretch: 18, shrink: 0, text: ' ' } as TextGlue,
    { type: 'box', width: 22, text: 'for' } as TextBox,
    { type: 'penalty', width: 6, cost: 50, flagged: true },
    { type: 'box', width: 22, text: 'est' } as TextBox,
    { type: 'glue', width: 0, stretch: 18, shrink: 0, text: ' ' } as TextGlue,
    { type: 'penalty', width: 0, cost: 0, flagged: false },
    { type: 'glue', width: 6, stretch: -36, shrink: 0, text: ' ' } as TextGlue,
    { type: 'box', width: 0, text: '' } as TextBox,
    { type: 'penalty', width: 0, cost: 1000, flagged: false },
    { type: 'glue', width: 0, stretch: 18, shrink: 0, text: ' ' } as TextGlue,
    { type: 'box', width: 29, text: 'and' } as TextBox,
    { type: 'glue', width: 0, stretch: 18, shrink: 0, text: ' ' } as TextGlue,
    { type: 'penalty', width: 0, cost: 0, flagged: false },
    { type: 'glue', width: 6, stretch: -36, shrink: 0, text: ' ' } as TextGlue,
    { type: 'box', width: 0, text: '' } as TextBox,
    { type: 'penalty', width: 0, cost: 1000, flagged: false },
    { type: 'glue', width: 0, stretch: 18, shrink: 0, text: ' ' } as TextGlue,
    { type: 'box', width: 23, text: 'sat' } as TextBox,
    { type: 'glue', width: 0, stretch: 18, shrink: 0, text: ' ' } as TextGlue,
    { type: 'penalty', width: 0, cost: 0, flagged: false },
    { type: 'glue', width: 6, stretch: -36, shrink: 0, text: ' ' } as TextGlue,
    { type: 'box', width: 0, text: '' } as TextBox,
    { type: 'penalty', width: 0, cost: 1000, flagged: false },
    { type: 'glue', width: 0, stretch: 18, shrink: 0, text: ' ' } as TextGlue,
    { type: 'box', width: 42, text: 'down' } as TextBox,
    { type: 'glue', width: 0, stretch: 18, shrink: 0, text: ' ' } as TextGlue,
    { type: 'penalty', width: 0, cost: 0, flagged: false },
    { type: 'glue', width: 6, stretch: -36, shrink: 0, text: ' ' } as TextGlue,
    { type: 'box', width: 0, text: '' } as TextBox,
    { type: 'penalty', width: 0, cost: 1000, flagged: false },
    { type: 'glue', width: 0, stretch: 18, shrink: 0, text: ' ' } as TextGlue,
    { type: 'box', width: 20, text: 'by' } as TextBox,
    { type: 'glue', width: 0, stretch: 18, shrink: 0, text: ' ' } as TextGlue,
    { type: 'penalty', width: 0, cost: 0, flagged: false },
    { type: 'glue', width: 6, stretch: -36, shrink: 0, text: ' ' } as TextGlue,
    { type: 'box', width: 0, text: '' } as TextBox,
    { type: 'penalty', width: 0, cost: 1000, flagged: false },
    { type: 'glue', width: 0, stretch: 18, shrink: 0, text: ' ' } as TextGlue,
    { type: 'box', width: 25, text: 'the' } as TextBox,
    { type: 'glue', width: 0, stretch: 18, shrink: 0, text: ' ' } as TextGlue,
    { type: 'penalty', width: 0, cost: 0, flagged: false },
    { type: 'glue', width: 6, stretch: -36, shrink: 0, text: ' ' } as TextGlue,
    { type: 'box', width: 0, text: '' } as TextBox,
    { type: 'penalty', width: 0, cost: 1000, flagged: false },
    { type: 'glue', width: 0, stretch: 18, shrink: 0, text: ' ' } as TextGlue,
    { type: 'box', width: 30, text: 'side' } as TextBox,
    { type: 'glue', width: 0, stretch: 18, shrink: 0, text: ' ' } as TextGlue,
    { type: 'penalty', width: 0, cost: 0, flagged: false },
    { type: 'glue', width: 6, stretch: -36, shrink: 0, text: ' ' } as TextGlue,
    { type: 'box', width: 0, text: '' } as TextBox,
    { type: 'penalty', width: 0, cost: 1000, flagged: false },
    { type: 'glue', width: 0, stretch: 18, shrink: 0, text: ' ' } as TextGlue,
    { type: 'box', width: 15, text: 'of' } as TextBox,
    { type: 'glue', width: 0, stretch: 18, shrink: 0, text: ' ' } as TextGlue,
    { type: 'penalty', width: 0, cost: 0, flagged: false },
    { type: 'glue', width: 6, stretch: -36, shrink: 0, text: ' ' } as TextGlue,
    { type: 'box', width: 0, text: '' } as TextBox,
    { type: 'penalty', width: 0, cost: 1000, flagged: false },
    { type: 'glue', width: 0, stretch: 18, shrink: 0, text: ' ' } as TextGlue,
    { type: 'box', width: 25, text: 'the' } as TextBox,
    { type: 'glue', width: 0, stretch: 18, shrink: 0, text: ' ' } as TextGlue,
    { type: 'penalty', width: 0, cost: 0, flagged: false },
    { type: 'glue', width: 6, stretch: -36, shrink: 0, text: ' ' } as TextGlue,
    { type: 'box', width: 0, text: '' } as TextBox,
    { type: 'penalty', width: 0, cost: 1000, flagged: false },
    { type: 'glue', width: 0, stretch: 18, shrink: 0, text: ' ' } as TextGlue,
    { type: 'box', width: 31, text: 'cool' } as TextBox,
    { type: 'glue', width: 0, stretch: 18, shrink: 0, text: ' ' } as TextGlue,
    { type: 'penalty', width: 0, cost: 0, flagged: false },
    { type: 'glue', width: 6, stretch: -36, shrink: 0, text: ' ' } as TextGlue,
    { type: 'box', width: 0, text: '' } as TextBox,
    { type: 'penalty', width: 0, cost: 1000, flagged: false },
    { type: 'glue', width: 0, stretch: 18, shrink: 0, text: ' ' } as TextGlue,
    { type: 'box', width: 35, text: 'foun' } as TextBox,
    { type: 'penalty', width: 6, cost: 50, flagged: true },
    { type: 'box', width: 36, text: 'tain;' } as TextBox,
    { type: 'glue', width: 0, stretch: 18, shrink: 0, text: ' ' } as TextGlue,
    { type: 'penalty', width: 0, cost: 0, flagged: false },
    { type: 'glue', width: 6, stretch: -36, shrink: 0, text: ' ' } as TextGlue,
    { type: 'box', width: 0, text: '' } as TextBox,
    { type: 'penalty', width: 0, cost: 1000, flagged: false },
    { type: 'glue', width: 0, stretch: 18, shrink: 0, text: ' ' } as TextGlue,
    { type: 'box', width: 29, text: 'and' } as TextBox,
    { type: 'glue', width: 0, stretch: 18, shrink: 0, text: ' ' } as TextGlue,
    { type: 'penalty', width: 0, cost: 0, flagged: false },
    { type: 'glue', width: 6, stretch: -36, shrink: 0, text: ' ' } as TextGlue,
    { type: 'box', width: 0, text: '' } as TextBox,
    { type: 'penalty', width: 0, cost: 1000, flagged: false },
    { type: 'glue', width: 0, stretch: 18, shrink: 0, text: ' ' } as TextGlue,
    { type: 'box', width: 41, text: 'when' } as TextBox,
    { type: 'glue', width: 0, stretch: 18, shrink: 0, text: ' ' } as TextGlue,
    { type: 'penalty', width: 0, cost: 0, flagged: false },
    { type: 'glue', width: 6, stretch: -36, shrink: 0, text: ' ' } as TextGlue,
    { type: 'box', width: 0, text: '' } as TextBox,
    { type: 'penalty', width: 0, cost: 1000, flagged: false },
    { type: 'glue', width: 0, stretch: 18, shrink: 0, text: ' ' } as TextGlue,
    { type: 'box', width: 25, text: 'she' } as TextBox,
    { type: 'glue', width: 0, stretch: 18, shrink: 0, text: ' ' } as TextGlue,
    { type: 'penalty', width: 0, cost: 0, flagged: false },
    { type: 'glue', width: 6, stretch: -36, shrink: 0, text: ' ' } as TextGlue,
    { type: 'box', width: 0, text: '' } as TextBox,
    { type: 'penalty', width: 0, cost: 1000, flagged: false },
    { type: 'glue', width: 0, stretch: 18, shrink: 0, text: ' ' } as TextGlue,
    { type: 'box', width: 29, text: 'was' } as TextBox,
    { type: 'glue', width: 0, stretch: 18, shrink: 0, text: ' ' } as TextGlue,
    { type: 'penalty', width: 0, cost: 0, flagged: false },
    { type: 'glue', width: 6, stretch: -36, shrink: 0, text: ' ' } as TextGlue,
    { type: 'box', width: 0, text: '' } as TextBox,
    { type: 'penalty', width: 0, cost: 1000, flagged: false },
    { type: 'glue', width: 0, stretch: 18, shrink: 0, text: ' ' } as TextGlue,
    { type: 'box', width: 44, text: 'bored' } as TextBox,
    { type: 'glue', width: 0, stretch: 18, shrink: 0, text: ' ' } as TextGlue,
    { type: 'penalty', width: 0, cost: 0, flagged: false },
    { type: 'glue', width: 6, stretch: -36, shrink: 0, text: ' ' } as TextGlue,
    { type: 'box', width: 0, text: '' } as TextBox,
    { type: 'penalty', width: 0, cost: 1000, flagged: false },
    { type: 'glue', width: 0, stretch: 18, shrink: 0, text: ' ' } as TextGlue,
    { type: 'box', width: 25, text: 'she' } as TextBox,
    { type: 'glue', width: 0, stretch: 18, shrink: 0, text: ' ' } as TextGlue,
    { type: 'penalty', width: 0, cost: 0, flagged: false },
    { type: 'glue', width: 6, stretch: -36, shrink: 0, text: ' ' } as TextGlue,
    { type: 'box', width: 0, text: '' } as TextBox,
    { type: 'penalty', width: 0, cost: 1000, flagged: false },
    { type: 'glue', width: 0, stretch: 18, shrink: 0, text: ' ' } as TextGlue,
    { type: 'box', width: 35, text: 'took' } as TextBox,
    { type: 'glue', width: 0, stretch: 18, shrink: 0, text: ' ' } as TextGlue,
    { type: 'penalty', width: 0, cost: 0, flagged: false },
    { type: 'glue', width: 6, stretch: -36, shrink: 0, text: ' ' } as TextGlue,
    { type: 'box', width: 0, text: '' } as TextBox,
    { type: 'penalty', width: 0, cost: 1000, flagged: false },
    { type: 'glue', width: 0, stretch: 18, shrink: 0, text: ' ' } as TextGlue,
    { type: 'box', width: 9, text: 'a' } as TextBox,
    { type: 'glue', width: 0, stretch: 18, shrink: 0, text: ' ' } as TextGlue,
    { type: 'penalty', width: 0, cost: 0, flagged: false },
    { type: 'glue', width: 6, stretch: -36, shrink: 0, text: ' ' } as TextGlue,
    { type: 'box', width: 0, text: '' } as TextBox,
    { type: 'penalty', width: 0, cost: 1000, flagged: false },
    { type: 'glue', width: 0, stretch: 18, shrink: 0, text: ' ' } as TextGlue,
    { type: 'box', width: 51, text: 'golden' } as TextBox,
    { type: 'glue', width: 0, stretch: 18, shrink: 0, text: ' ' } as TextGlue,
    { type: 'penalty', width: 0, cost: 0, flagged: false },
    { type: 'glue', width: 6, stretch: -36, shrink: 0, text: ' ' } as TextGlue,
    { type: 'box', width: 0, text: '' } as TextBox,
    { type: 'penalty', width: 0, cost: 1000, flagged: false },
    { type: 'glue', width: 0, stretch: 18, shrink: 0, text: ' ' } as TextGlue,
    { type: 'box', width: 34, text: 'ball,' } as TextBox,
    { type: 'glue', width: 0, stretch: 18, shrink: 0, text: ' ' } as TextGlue,
    { type: 'penalty', width: 0, cost: 0, flagged: false },
    { type: 'glue', width: 6, stretch: -36, shrink: 0, text: ' ' } as TextGlue,
    { type: 'box', width: 0, text: '' } as TextBox,
    { type: 'penalty', width: 0, cost: 1000, flagged: false },
    { type: 'glue', width: 0, stretch: 18, shrink: 0, text: ' ' } as TextGlue,
    { type: 'box', width: 29, text: 'and' } as TextBox,
    { type: 'glue', width: 0, stretch: 18, shrink: 0, text: ' ' } as TextGlue,
    { type: 'penalty', width: 0, cost: 0, flagged: false },
    { type: 'glue', width: 6, stretch: -36, shrink: 0, text: ' ' } as TextGlue,
    { type: 'box', width: 0, text: '' } as TextBox,
    { type: 'penalty', width: 0, cost: 1000, flagged: false },
    { type: 'glue', width: 0, stretch: 18, shrink: 0, text: ' ' } as TextGlue,
    { type: 'box', width: 45, text: 'threw' } as TextBox,
    { type: 'glue', width: 0, stretch: 18, shrink: 0, text: ' ' } as TextGlue,
    { type: 'penalty', width: 0, cost: 0, flagged: false },
    { type: 'glue', width: 6, stretch: -36, shrink: 0, text: ' ' } as TextGlue,
    { type: 'box', width: 0, text: '' } as TextBox,
    { type: 'penalty', width: 0, cost: 1000, flagged: false },
    { type: 'glue', width: 0, stretch: 18, shrink: 0, text: ' ' } as TextGlue,
    { type: 'box', width: 12, text: 'it' } as TextBox,
    { type: 'glue', width: 0, stretch: 18, shrink: 0, text: ' ' } as TextGlue,
    { type: 'penalty', width: 0, cost: 0, flagged: false },
    { type: 'glue', width: 6, stretch: -36, shrink: 0, text: ' ' } as TextGlue,
    { type: 'box', width: 0, text: '' } as TextBox,
    { type: 'penalty', width: 0, cost: 1000, flagged: false },
    { type: 'glue', width: 0, stretch: 18, shrink: 0, text: ' ' } as TextGlue,
    { type: 'box', width: 20, text: 'up' } as TextBox,
    { type: 'glue', width: 0, stretch: 18, shrink: 0, text: ' ' } as TextGlue,
    { type: 'penalty', width: 0, cost: 0, flagged: false },
    { type: 'glue', width: 6, stretch: -36, shrink: 0, text: ' ' } as TextGlue,
    { type: 'box', width: 0, text: '' } as TextBox,
    { type: 'penalty', width: 0, cost: 1000, flagged: false },
    { type: 'glue', width: 0, stretch: 18, shrink: 0, text: ' ' } as TextGlue,
    { type: 'box', width: 19, text: 'on' } as TextBox,
    { type: 'glue', width: 0, stretch: 18, shrink: 0, text: ' ' } as TextGlue,
    { type: 'penalty', width: 0, cost: 0, flagged: false },
    { type: 'glue', width: 6, stretch: -36, shrink: 0, text: ' ' } as TextGlue,
    { type: 'box', width: 0, text: '' } as TextBox,
    { type: 'penalty', width: 0, cost: 1000, flagged: false },
    { type: 'glue', width: 0, stretch: 18, shrink: 0, text: ' ' } as TextGlue,
    { type: 'box', width: 34, text: 'high' } as TextBox,
    { type: 'glue', width: 0, stretch: 18, shrink: 0, text: ' ' } as TextGlue,
    { type: 'penalty', width: 0, cost: 0, flagged: false },
    { type: 'glue', width: 6, stretch: -36, shrink: 0, text: ' ' } as TextGlue,
    { type: 'box', width: 0, text: '' } as TextBox,
    { type: 'penalty', width: 0, cost: 1000, flagged: false },
    { type: 'glue', width: 0, stretch: 18, shrink: 0, text: ' ' } as TextGlue,
    { type: 'box', width: 29, text: 'and' } as TextBox,
    { type: 'glue', width: 0, stretch: 18, shrink: 0, text: ' ' } as TextGlue,
    { type: 'penalty', width: 0, cost: 0, flagged: false },
    { type: 'glue', width: 6, stretch: -36, shrink: 0, text: ' ' } as TextGlue,
    { type: 'box', width: 0, text: '' } as TextBox,
    { type: 'penalty', width: 0, cost: 1000, flagged: false },
    { type: 'glue', width: 0, stretch: 18, shrink: 0, text: ' ' } as TextGlue,
    { type: 'box', width: 53, text: 'caught' } as TextBox,
    { type: 'glue', width: 0, stretch: 18, shrink: 0, text: ' ' } as TextGlue,
    { type: 'penalty', width: 0, cost: 0, flagged: false },
    { type: 'glue', width: 6, stretch: -36, shrink: 0, text: ' ' } as TextGlue,
    { type: 'box', width: 0, text: '' } as TextBox,
    { type: 'penalty', width: 0, cost: 1000, flagged: false },
    { type: 'glue', width: 0, stretch: 18, shrink: 0, text: ' ' } as TextGlue,
    { type: 'box', width: 17, text: 'it;' } as TextBox,
    { type: 'glue', width: 0, stretch: 18, shrink: 0, text: ' ' } as TextGlue,
    { type: 'penalty', width: 0, cost: 0, flagged: false },
    { type: 'glue', width: 6, stretch: -36, shrink: 0, text: ' ' } as TextGlue,
    { type: 'box', width: 0, text: '' } as TextBox,
    { type: 'penalty', width: 0, cost: 1000, flagged: false },
    { type: 'glue', width: 0, stretch: 18, shrink: 0, text: ' ' } as TextGlue,
    { type: 'box', width: 29, text: 'and' } as TextBox,
    { type: 'glue', width: 0, stretch: 18, shrink: 0, text: ' ' } as TextGlue,
    { type: 'penalty', width: 0, cost: 0, flagged: false },
    { type: 'glue', width: 6, stretch: -36, shrink: 0, text: ' ' } as TextGlue,
    { type: 'box', width: 0, text: '' } as TextBox,
    { type: 'penalty', width: 0, cost: 1000, flagged: false },
    { type: 'glue', width: 0, stretch: 18, shrink: 0, text: ' ' } as TextGlue,
    { type: 'box', width: 29, text: 'this' } as TextBox,
    { type: 'glue', width: 0, stretch: 18, shrink: 0, text: ' ' } as TextGlue,
    { type: 'penalty', width: 0, cost: 0, flagged: false },
    { type: 'glue', width: 6, stretch: -36, shrink: 0, text: ' ' } as TextGlue,
    { type: 'box', width: 0, text: '' } as TextBox,
    { type: 'penalty', width: 0, cost: 1000, flagged: false },
    { type: 'glue', width: 0, stretch: 18, shrink: 0, text: ' ' } as TextGlue,
    { type: 'box', width: 29, text: 'ball' } as TextBox,
    { type: 'glue', width: 0, stretch: 18, shrink: 0, text: ' ' } as TextGlue,
    { type: 'penalty', width: 0, cost: 0, flagged: false },
    { type: 'glue', width: 6, stretch: -36, shrink: 0, text: ' ' } as TextGlue,
    { type: 'box', width: 0, text: '' } as TextBox,
    { type: 'penalty', width: 0, cost: 1000, flagged: false },
    { type: 'glue', width: 0, stretch: 18, shrink: 0, text: ' ' } as TextGlue,
    { type: 'box', width: 29, text: 'was' } as TextBox,
    { type: 'glue', width: 0, stretch: 18, shrink: 0, text: ' ' } as TextGlue,
    { type: 'penalty', width: 0, cost: 0, flagged: false },
    { type: 'glue', width: 6, stretch: -36, shrink: 0, text: ' ' } as TextGlue,
    { type: 'box', width: 0, text: '' } as TextBox,
    { type: 'penalty', width: 0, cost: 1000, flagged: false },
    { type: 'glue', width: 0, stretch: 18, shrink: 0, text: ' ' } as TextGlue,
    { type: 'box', width: 25, text: 'her' } as TextBox,
    { type: 'glue', width: 0, stretch: 18, shrink: 0, text: ' ' } as TextGlue,
    { type: 'penalty', width: 0, cost: 0, flagged: false },
    { type: 'glue', width: 6, stretch: -36, shrink: 0, text: ' ' } as TextGlue,
    { type: 'box', width: 0, text: '' } as TextBox,
    { type: 'penalty', width: 0, cost: 1000, flagged: false },
    { type: 'glue', width: 0, stretch: 18, shrink: 0, text: ' ' } as TextGlue,
    { type: 'box', width: 40, text: 'favor' } as TextBox,
    { type: 'penalty', width: 6, cost: 50, flagged: true },
    { type: 'box', width: 20, text: 'ite' } as TextBox,
    { type: 'glue', width: 0, stretch: 18, shrink: 0, text: ' ' } as TextGlue,
    { type: 'penalty', width: 0, cost: 0, flagged: false },
    { type: 'glue', width: 6, stretch: -36, shrink: 0, text: ' ' } as TextGlue,
    { type: 'box', width: 0, text: '' } as TextBox,
    { type: 'penalty', width: 0, cost: 1000, flagged: false },
    { type: 'glue', width: 0, stretch: 18, shrink: 0, text: ' ' } as TextGlue,
    { type: 'box', width: 34, text: 'play' } as TextBox,
    { type: 'penalty', width: 6, cost: 50, flagged: true },
    { type: 'box', width: 46, text: 'thing.' } as TextBox,
    { type: 'glue', width: 0, stretch: 18, shrink: 0, text: '' } as TextGlue,
    { type: 'penalty', width: 0, cost: -1000, flagged: false },
  ];
}

describe('layout', () => {
  describe('breakLines', () => {
    it('returns an empty list if the input is empty', () => {
      const breakpoints = breakLines([], 100);
      assert.deepEqual(breakpoints, []);
    });

    it('returns just the initial breakpoint if there are no legal breakpoints', () => {
      const breakpoints = breakLines([box(10)], 100);
      assert.deepEqual(breakpoints, [0]);
    });

    it('generates narrow frog prince layout from p. 81 of Digital Typography', () => {
      const items = frogPrince();
      // width given on p. 78 of Digital Typography
      const lineLengths = [372, ...Array(items.length - 1).fill(390)];
      const breakpoints = breakLines(items, lineLengths);
      const lines = lineStrings(items, breakpoints);
      assert.deepEqual(lines, [
        'In olden times when wishing still helped one,',
        'there lived a king whose daughters were all beau-',
        'tiful; and the youngest was so beautiful that the',
        'sun itself, which has seen so much, was aston-',
        'ished whenever it shone in her face. Close by the',
        "king's castle lay a great dark forest, and under an",
        'old lime-tree in the forest was a well, and when',
        "the day was very warm, the king's child went out",
        'into the forest and sat down by the side of the',
        'cool fountain; and when she was bored she took a',
        'golden ball, and threw it up on high and caught',
        'it; and this ball was her favorite plaything. -',
      ]);
      const adjRatios = adjustmentRatios(items, lineLengths, breakpoints).map((num) =>
        Number(num.toFixed(3)),
      );
      assert.deepEqual(
        adjRatios,
        [0.857, 0.0, 0.28, 1.0, 0.067, -0.278, 0.536, -0.167, 0.7, -0.176, 0.357, 0.049],
      );
    });

    it('generates wide frog prince layout from p. 82 of Digital Typography', () => {
      const items = frogPrince();
      // width given on p. 81 of Digital Typography
      const lineLengths = [482, ...Array(items.length - 1).fill(500)];
      const breakpoints = breakLines(items, lineLengths);
      const lines = lineStrings(items, breakpoints);
      assert.deepEqual(lines, [
        'In olden times when wishing still helped one, there lived a',
        'king whose daughters were all beautiful; and the youngest was',
        'so beautiful that the sun itself, which has seen so much, was',
        "astonished whenever it shone in her face. Close by the king's",
        'castle lay a great dark forest, and under an old lime-tree in the',
        "forest was a well, and when the day was very warm, the king's",
        'child went out into the forest and sat down by the side of the',
        'cool fountain; and when she was bored she took a golden ball,',
        'and threw it up on high and caught it; and this ball was her',
        'favorite plaything. -',
      ]);
      const adjRatios = adjustmentRatios(items, lineLengths, breakpoints).map((num) =>
        Number(num.toFixed(3)),
      );
      assert.deepEqual(
        adjRatios,
        [0.774, 0.179, 0.629, 0.545, 0.0, 0.079, 0.282, 0.294, 0.575, 0.353],
      );
    });

    it('generates centered frog prince layout from p. 95 of Digital Typography', () => {
      const items = frogPrinceCentered();
      // width inferred from 34 ems = 612 machine units
      const breakpoints = breakLines(items, 612);
      const lines = lineStrings(items, breakpoints).map((line) => line.replace(/\s+/g, ' '));
      assert.deepEqual(lines, [
        'In olden times when wishing still helped one, there lived a king whose',
        'daughters were all beautiful; and the youngest was so beautiful that the',
        'sun itself, which has seen so much, was astonished whenever it shone in',
        "her face. Close by the king's castle lay a great dark forest, and under an",
        'old lime-tree in the forest was a well, and when the day was very warm,',
        "the king's child went out into the forest and sat down by the side of the",
        'cool fountain; and when she was bored she took a golden ball, and threw',
        'it up on high and caught it; and this ball was her favorite plaything.',
      ]);
    });

    it('generates expected layout', () => {
      const f = readLayoutFixture(fixture);
      f.outputs.forEach(({ lines, layoutOptions }) => {
        const measure = (text: string) => text.length * 5;
        const items = layoutItemsFromString(f.input, measure);
        const breakpoints = breakLines(items, layoutOptions.lineWidths, layoutOptions);
        const itemText = (item: TextInputItem) => (item.type == 'box' ? item.text : ' ');

        // Check that breakpoints occur at expected positions.
        const actualLines = chunk(breakpoints, 2)
          .map(([start, end]) =>
            items
              .slice(start, end)
              .map(itemText)
              .join('')
              .trim(),
          )
          .filter(l => l.length > 0);

        assert.deepEqual(actualLines, lines);

        // Check that adjustment ratios for each line are in range.
        const adjRatios = adjustmentRatios(items, layoutOptions.lineWidths, breakpoints);
        adjRatios.forEach(ar => {
          assert.isAtLeast(ar, -1);
          assert.isAtMost(ar, layoutOptions.maxAdjustmentRatio);
        });
      });
    });

    it('uses defaults if options are omitted', () => {
      const measure = (text: string) => text.length * 5;
      const items = layoutItemsFromString('one fine day in the middle of the night', measure);
      const breakpoints = breakLines(items, 100);
      assert.deepEqual(breakpoints, [0, 9, 18]);
    });

    it('succeeds when min adjustment ratio is exceeded', () => {
      // Lay out input into a line with a width (5) of less than the box width
      // (10).
      // We'll give up and make lines which exceed the specified length.
      const lines = repeat([box(10), glue(5, 1, 1)], 5);
      const items: InputItem[] = [...lines, forcedBreak()];
      const breakpoints = breakLines(items, 5, {
        maxAdjustmentRatio: 1,
      });
      assert.deepEqual(breakpoints, [0, 1, 3, 5, 7, 9, 10]);
    });

    it('handles glue with zero stretch', () => {
      const items = [box(10), glue(5, 0, 0), box(10), forcedBreak()];
      const breakpoints = breakLines(items, 50);
      assert.deepEqual(breakpoints, [0, 3]);
    });

    it('handles glue with zero shrink', () => {
      const items = [box(10), glue(5, 0, 0), box(10), forcedBreak()];
      const breakpoints = breakLines(items, 21);
      assert.deepEqual(breakpoints, [0, 3]);
    });

    it('handles boxes that are wider than the line width', () => {
      const items = [box(5), glue(5, 10, 10), box(100), glue(5, 10, 10), forcedBreak()];
      const breakpoints = breakLines(items, 50);
      assert.deepEqual(breakpoints, [0, 3, 4]);
    });

    [
      {
        items: [box(10), glue(10, 10, 10), box(10), forcedBreak()],
        lineWidth: 1000,
        expectedBreakpoints: [0, 3],
      },
      {
        items: [box(10), glue(10, 5, 5), box(100), forcedBreak()],
        lineWidth: 50,
        expectedBreakpoints: [0, 3],
      },
    ].forEach(({ items, lineWidth, expectedBreakpoints }, i) => {
      it(`succeeds when initial max adjustment ratio is exceeded (${i + 1})`, () => {
        // Lay out input into a line which would need to stretch more than
        // `glue.width + maxAdjustmentRatio * glue.stretch` in order to fit.
        //
        // Currently the algorithm will simply retry with a higher threshold. If
        // we followed TeX's solution (see Knuth-Plass p.1162) then we would first
        // retry with the same threshold after applying hyphenation to break
        // existing boxes and then only after that retry with a higher threshold.
        const breakpoints = breakLines(items, lineWidth, {
          initialMaxAdjustmentRatio: 1,
        });
        assert.deepEqual(breakpoints, expectedBreakpoints);
      });
    });

    it('applies a penalty for consecutive lines ending with a hyphen', () => {
      const text = 'one two long-word one long-word';
      const charWidth = 5;
      const glueStretch = 60;
      const items = itemsFromString(text, charWidth, glueStretch);
      const lineWidth = 13 * charWidth;

      // Break lines without a double-hyphen penalty.
      let breakpoints = breakLines(items, lineWidth);
      let lines = lineStrings(items, breakpoints);
      assert.deepEqual(
        lines,
        ['one two long-', 'word one long-', 'word'],
        'did not break as expected without penalty',
      );

      // Break lines with a double-hyphen penalty.
      breakpoints = breakLines(items, lineWidth, {
        doubleHyphenPenalty: 200,
      });
      lines = lineStrings(items, breakpoints);
      assert.deepEqual(
        lines,
        ['one two', 'longword one', 'longword'],
        'did not break as expected with penalty',
      );
    });

    it('applies a penalty when adjacent lines have different tightness', () => {
      // Getting this test case to produce different output with and without the
      // penalty applied required ~~lots of fiddling~~ highly scientific
      // adjustments.
      //
      // It requires that boxes have enough variety and maximum width, and glues
      // have sufficiently small stretch, that adjustment ratios between lines
      // are large enough to fall into different "fitness class" thresholds.
      const prng = new (XorShift as any)([1, 10, 15, 20]);
      const wordSoup = (length: number) => {
        let result: InputItem[] = [];
        let wordLen = 5;
        while (result.length < length) {
          result.push({ type: 'box', width: prng.random() * 20 });
          result.push({ type: 'glue', width: 6, shrink: 3, stretch: 5 });
        }
        return result;
      };
      const items = wordSoup(100);
      const lineWidth = 50;

      // Break lines without contrasting tightess penalty.
      let breakpointsA = breakLines(items, lineWidth, {
        adjacentLooseTightPenalty: 0,
      });

      // Break lines with constrasting tightness penalty.
      let breakpointsB = breakLines(items, lineWidth, {
        adjacentLooseTightPenalty: 10000,
      });

      assert.notDeepEqual(breakpointsA, breakpointsB);
    });

    it('throws `MaxAdjustmentExceededError` if max adjustment ratio is exceeded', () => {
      const items = [box(10), glue(5, 10, 10), box(10), forcedBreak()];
      const opts = { maxAdjustmentRatio: 1 };
      assert.throws(() => breakLines(items, 100, opts), MaxAdjustmentExceededError);
    });
  });

  describe('positionItems', () => {
    it('lays out items with justified margins', () => {
      const items = [
        box(10),
        glue(10, 5, 5),
        box(10),
        glue(10, 5, 5),
        box(10),
        glue(10, 5, 5),
        forcedBreak(),
      ];
      const lineWidth = 35;
      const breakpoints = [0, 3, 6];

      const boxes = positionItems(items, lineWidth, breakpoints);

      assert.deepEqual(boxes, [
        {
          item: 0,
          line: 0,
          xOffset: 0,
          width: 10,
        },
        {
          item: 2,
          line: 0,
          xOffset: 25,
          width: 10,
        },
        {
          item: 4,
          line: 1,
          xOffset: 0,
          width: 10,
        },
      ]);
    });

    it('does not let gap between boxes shrink below `glue.width - glue.shrink`', () => {
      const items = [box(10), glue(10, 5, 5), box(100), forcedBreak()];
      const lineWidth = 50;
      const breakpoints = [0, 3];

      const boxes = positionItems(items, lineWidth, breakpoints);

      assert.deepEqual(boxes, [
        {
          item: 0,
          line: 0,
          xOffset: 0,
          width: 10,
        },
        {
          item: 2,
          line: 0,
          xOffset: 15,
          width: 100,
        },
      ]);
    });
  });
});
