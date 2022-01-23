# Udemy - Node.js with Test-Driven Development

## Some notes
Client application can be started using the following command:

    npx http-server -c-1 -p 8080 -P http://localhost:3000

### ESLint
Some advices for setting-up eslint with prettier can be found [here](https://stackoverflow.com/questions/53516594/why-do-i-keep-getting-delete-cr-prettier-prettier).

The following part of the section with eslint rules in the package.json were changed:

    "prettier/prettier": [
	    "warn",
        "error", {
            "endOfLine": "auto"
        }
    ]

to just:

    "prettier/prettier": [
	    "warn"
    ]

The following part of the section with eslint rules  were removed:

    "quotes": [
        "warn",
        "single"
    ],

### Prettier
The following rules were added to prettier section in package.json file:

    "endOfLine": "lf",
    "tabWidth": 4,
    "useTabs": true

## Credits
This project is based on the following Udemy tutorial: [Node js with Test Driven Development](https://www.udemy.com/course/test-driven-development-with-nodejs)