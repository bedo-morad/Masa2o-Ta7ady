import { signal, WritableSignal } from '@angular/core';

export interface SharedBasicDrafts {
  readonly addPlayer: WritableSignal<string>;
  readonly addRule: WritableSignal<string>;
  readonly addQuestion: WritableSignal<string>;
  readonly addAnswer: WritableSignal<string>;
  readonly editText: WritableSignal<string>;
  readonly editQuestion: WritableSignal<string>;
  readonly editAnswer: WritableSignal<string>;
}

export function makeSharedBasicDrafts(): SharedBasicDrafts {
  return {
    addPlayer: signal(''),
    addRule: signal(''),
    addQuestion: signal(''),
    addAnswer: signal(''),
    editText: signal(''),
    editQuestion: signal(''),
    editAnswer: signal(''),
  };
}
