import type { CommentAuthor, CommentSide } from '../types/comment';
import { CommentForm } from './comment-form';

interface CommentFormRowProps {
  colSpan: number;
  filePath: string;
  side: CommentSide;
  startLine: number;
  endLine: number;
  oldStartLine?: number;
  oldEndLine?: number;
  newStartLine?: number;
  newEndLine?: number;
  currentAuthor: CommentAuthor;
  onSubmit: (filePath: string, side: CommentSide, startLine: number, endLine: number, body: string, author: CommentAuthor, oldStartLine?: number, oldEndLine?: number, newStartLine?: number, newEndLine?: number) => void;
  onCancel: () => void;
  viewMode?: 'unified' | 'split';
}

export function CommentFormRow(props: CommentFormRowProps) {
  const { colSpan, filePath, side, startLine, endLine, oldStartLine, oldEndLine, newStartLine, newEndLine, currentAuthor, onSubmit, onCancel, viewMode } = props;

  function buildLineLabel(): string {
    if (side === 'both') {
      const parts: string[] = [];
      if (oldStartLine !== undefined && oldEndLine !== undefined) {
        const oldLabel = oldStartLine === oldEndLine ? `${oldStartLine}` : `${oldStartLine}–${oldEndLine}`;
        parts.push(`old ${oldLabel}`);
      }
      if (newStartLine !== undefined && newEndLine !== undefined) {
        const newLabel = newStartLine === newEndLine ? `${newStartLine}` : `${newStartLine}–${newEndLine}`;
        parts.push(`new ${newLabel}`);
      }
      return `Add a comment on lines ${parts.join(' and ')}`;
    }
    const lineLabel = startLine === endLine ? `${startLine}` : `${startLine} to ${endLine}`;
    return `Add a comment on line${startLine !== endLine ? 's' : ''} ${lineLabel}`;
  }

  const formContent = (
    <div className="max-w-[700px]">
      <CommentForm
        onSubmit={(body) => onSubmit(filePath, side, startLine, endLine, body, currentAuthor, oldStartLine, oldEndLine, newStartLine, newEndLine)}
        onCancel={onCancel}
        lineLabel={buildLineLabel()}
      />
    </div>
  );

  if (viewMode === 'split') {
    if (side === 'both') {
      return (
        <tr>
          <td colSpan={colSpan * 2} className="px-4 py-3 bg-bg-secondary">{formContent}</td>
        </tr>
      );
    }
    return (
      <tr>
        {side === 'old' ? (
          <>
            <td colSpan={colSpan} className="px-4 py-3 bg-bg-secondary">{formContent}</td>
            <td colSpan={colSpan} className="bg-bg-secondary"></td>
          </>
        ) : (
          <>
            <td colSpan={colSpan} className="bg-bg-secondary"></td>
            <td colSpan={colSpan} className="px-4 py-3 bg-bg-secondary">{formContent}</td>
          </>
        )}
      </tr>
    );
  }

  return (
    <tr>
      <td colSpan={colSpan} className="px-4 py-3 bg-bg-secondary">
        {formContent}
      </td>
    </tr>
  );
}
