import type { EventStorming } from '@mermaid-js/parser';
import { parse } from '@mermaid-js/parser';
import type { ParserDefinition } from '../../diagram-api/types.js';
import { log } from '../../logger.js';
import { populateCommonDb } from '../common/populateCommonDb.js';
import { db } from './db.js';

const populate = (ast: EventStorming) => {
  populateCommonDb(ast, db);
  db.setAst(ast);
};

export const parser: ParserDefinition = {
  parse: async (input: string): Promise<void> => {
    const ast: EventStorming = await parse('eventstorming', input);
    log.debug(ast);
    populate(ast);
  },
};
