export const getGPUVersion = (model: string) => {
  model = model.replace(/\([^)]+\)/, '');

  const matches =
    // First set of digits
    model.match(/\d+/) ||
    // If the renderer did not contain any numbers, match letters
    model.match(/(\W|^)([A-Za-z]{1,3})(\W|$)/g);

  // Remove any non-word characters and also remove 'amd' which could be matched
  // in the clause above
  return matches?.join('').replace(/\W|amd/g, '') ?? '';
};
