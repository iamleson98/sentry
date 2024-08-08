import {useCallback, useRef} from 'react';
import {findDOMNode} from 'react-dom';
import styled from '@emotion/styled';

import {CopyToClipboardButton} from 'sentry/components/copyToClipboardButton';
import type {InputProps} from 'sentry/components/inputGroup';
import {InputGroup} from 'sentry/components/inputGroup';
import {selectText} from 'sentry/utils/selectText';

interface Props extends Omit<InputProps, 'onCopy'> {
  /**
   * Text to copy
   */
  children: string;
  className?: string;
  disabled?: boolean;
  onCopy?: (value: string) => void;
  /**
   * Always show the ending of a long overflowing text in input
   */
  rtl?: boolean;
  style?: React.CSSProperties;
}

function TextCopyInput({
  className,
  disabled,
  style,
  onCopy,
  rtl,
  size,
  children,
  ...inputProps
}: Props) {
  const textRef = useRef<HTMLInputElement>(null);

  const handleSelectText = useCallback(() => {
    if (!textRef.current) {
      return;
    }

    // We use findDOMNode here because `this.textRef` is not a dom node,
    // it's a ref to AutoSelectText
    const node = findDOMNode(textRef.current); // eslint-disable-line react/no-find-dom-node
    if (!node || !(node instanceof HTMLElement)) {
      return;
    }

    if (rtl && node instanceof HTMLInputElement) {
      // we don't want to select the first character - \u202A, nor the last - \u202C
      node.setSelectionRange(1, node.value.length - 1);
    } else {
      selectText(node);
    }
  }, [rtl]);

  /**
   * We are using direction: rtl; to always show the ending of a long overflowing text in input.
   *
   * This however means that the trailing characters with BiDi class O.N. ('Other Neutrals') goes to the other side.
   * Hello! becomes !Hello and vice versa. This is a problem for us when we want to show path in this component, because
   * /user/local/bin becomes user/local/bin/. Wrapping in unicode characters for left-to-righ embedding solves this,
   * however we need to be aware of them when selecting the text - we are solving that by offsetting the selectionRange.
   */
  const inputValue = rtl ? '\u202A' + children + '\u202C' : children;

  return (
    <InputGroup className={className}>
      <StyledInput
        readOnly
        disabled={disabled}
        ref={textRef}
        style={style}
        value={inputValue}
        onClick={handleSelectText}
        size={size}
        rtl={rtl}
        {...inputProps}
      />
      <InputGroup.TrailingItems>
        <StyledCopyButton
          borderless
          iconSize={size === 'xs' ? 'xs' : 'sm'}
          onCopy={onCopy}
          text={children}
        />
      </InputGroup.TrailingItems>
    </InputGroup>
  );
}

export default TextCopyInput;

const StyledInput = styled(InputGroup.Input)<{rtl?: boolean}>`
  direction: ${p => (p.rtl ? 'rtl' : 'ltr')};
`;

const StyledCopyButton = styled(CopyToClipboardButton)`
  padding: ${p => p.theme.space(0.5)};
  min-height: 0;
  height: auto;
`;
