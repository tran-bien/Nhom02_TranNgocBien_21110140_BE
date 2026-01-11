const slugify = require("slugify");

const createSlug = (text, options = {}) => {
  const defaultOptions = {
    lower: true,
    strict: true,
    locale: "vi",
    remove: /[*+~.()'"!:@]/g,
    ...options,
  };

  return slugify(text, defaultOptions);
};

module.exports = { createSlug };
