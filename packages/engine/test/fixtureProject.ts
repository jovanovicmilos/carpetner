import fixture from '../../../fixtures/kuhinja-petrovic.json';
import { fromDataModel, type DataModelProject } from '../src';

export const project = fromDataModel(fixture.project as unknown as DataModelProject);
export const expected = fixture.expected;
