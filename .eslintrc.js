module.exports = {
    "parser": "babel-eslint",
    "extends": "eslint:recommended",
    "plugins": [
        "standard",
        "promise",
        "flowtype"
    ],
    "env": {
      "es6": true,
      "browser": true
    },
    "parserOptions": {
        "ecmaVersion": 6,
        "sourceType": "module",
    },
    "rules": {
      "semi": ["error", "always"]
    }
};
