export type Library = {
  id: string;
  name: string;
  code?: string;
  version?: string;
};

export type BsddClass = {
  name: string;
  referenceCode?: string;
  uri: string;
  dictionaryUri?: string;
  dictionaryName?: string;
};

export type BsddClassDetail = BsddClass & {
  description?: string;
};
