import type {
  DefaultSharedCoreModuleContext,
  LangiumCoreServices,
  LangiumSharedCoreServices,
  Module,
  PartialLangiumCoreServices,
} from 'langium';
import {
  EmptyFileSystem,
  createDefaultCoreModule,
  createDefaultSharedCoreModule,
  inject,
} from 'langium';
import { CommonValueConverter } from '../common/valueConverter.js';
import {
  MermaidGeneratedSharedModule,
  EventStormingDiagramGeneratedModule as EventStormingGeneratedModule,
} from '../generated/module.js';
import { EventStormingTokenBuilder } from './tokenBuilder.js';

interface EventStormingAddedServices {
  parser: {
    TokenBuilder: EventStormingTokenBuilder;
    ValueConverter: CommonValueConverter;
  };
}

export type EventStormingServices = LangiumCoreServices & EventStormingAddedServices;

export const EventStormingModule: Module<
  EventStormingServices,
  PartialLangiumCoreServices & EventStormingAddedServices
> = {
  parser: {
    TokenBuilder: () => new EventStormingTokenBuilder(),
    ValueConverter: () => new CommonValueConverter(),
  },
};

export function createEventStormingServices(
  context: DefaultSharedCoreModuleContext = EmptyFileSystem
): {
  shared: LangiumSharedCoreServices;
  EventStorming: EventStormingServices;
} {
  const shared: LangiumSharedCoreServices = inject(
    createDefaultSharedCoreModule(context),
    MermaidGeneratedSharedModule
  );
  const EventStorming: EventStormingServices = inject(
    createDefaultCoreModule({ shared }),
    EventStormingGeneratedModule,
    EventStormingModule
  );
  shared.ServiceRegistry.register(EventStorming);
  return { shared, EventStorming };
}
