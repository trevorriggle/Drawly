/**
 * Command history for undo/redo
 * Implements a simple stack-based history with command replay
 */

import type { DrawingCommand } from './commands.js';

export interface HistoryState {
  /** All commands in history */
  commands: DrawingCommand[];
  /** Current position in history */
  currentIndex: number;
  /** Maximum history size */
  maxSize: number;
}

/**
 * Create a new history state
 */
export function createHistory(maxSize = 100): HistoryState {
  return {
    commands: [],
    currentIndex: -1,
    maxSize,
  };
}

/**
 * Add a command to history
 * This will clear any commands after the current index (redo history)
 */
export function addCommand(
  history: HistoryState,
  command: DrawingCommand
): HistoryState {
  // Remove any commands after current index
  const newCommands = history.commands.slice(0, history.currentIndex + 1);

  // Add the new command
  newCommands.push(command);

  // Enforce max size by removing oldest commands
  const trimmedCommands = newCommands.slice(-history.maxSize);

  return {
    ...history,
    commands: trimmedCommands,
    currentIndex: trimmedCommands.length - 1,
  };
}

/**
 * Undo the last command
 * Returns the new history state and the command to undo (if any)
 */
export function undo(
  history: HistoryState
): { history: HistoryState; command: DrawingCommand | null } {
  if (history.currentIndex < 0) {
    return { history, command: null };
  }

  const command = history.commands[history.currentIndex];

  return {
    history: {
      ...history,
      currentIndex: history.currentIndex - 1,
    },
    command,
  };
}

/**
 * Redo the next command
 * Returns the new history state and the command to redo (if any)
 */
export function redo(
  history: HistoryState
): { history: HistoryState; command: DrawingCommand | null } {
  if (history.currentIndex >= history.commands.length - 1) {
    return { history, command: null };
  }

  const newIndex = history.currentIndex + 1;
  const command = history.commands[newIndex];

  return {
    history: {
      ...history,
      currentIndex: newIndex,
    },
    command,
  };
}

/**
 * Check if undo is available
 */
export function canUndo(history: HistoryState): boolean {
  return history.currentIndex >= 0;
}

/**
 * Check if redo is available
 */
export function canRedo(history: HistoryState): boolean {
  return history.currentIndex < history.commands.length - 1;
}

/**
 * Get all commands up to the current index (active commands)
 */
export function getActiveCommands(history: HistoryState): DrawingCommand[] {
  return history.commands.slice(0, history.currentIndex + 1);
}

/**
 * Clear all history
 */
export function clearHistory(history: HistoryState): HistoryState {
  return createHistory(history.maxSize);
}

/**
 * Get a subset of commands by type
 */
export function getCommandsByType<T extends DrawingCommand['type']>(
  history: HistoryState,
  type: T
): Extract<DrawingCommand, { type: T }>[] {
  const activeCommands = getActiveCommands(history);
  return activeCommands.filter(
    (cmd): cmd is Extract<DrawingCommand, { type: T }> => cmd.type === type
  );
}
