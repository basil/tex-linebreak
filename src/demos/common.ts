import { layoutText, TextBox } from '../helpers';
import { justifyContent } from '../html';

function rerender() {
  // Render as HTML.
  const htmlParas = Array.from(document.querySelectorAll('p'));
  justifyContent(htmlParas);
}

rerender();
