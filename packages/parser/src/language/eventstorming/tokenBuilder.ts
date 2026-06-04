import { AbstractMermaidTokenBuilder } from '../common/index.js';

export class EventStormingTokenBuilder extends AbstractMermaidTokenBuilder {
  public constructor() {
    super(['eventstorming']);
  }
}
