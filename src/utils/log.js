
const log = (msg) => {
    console.log(`\x1b[32m ${msg} \x1b[0m`);
};

const redlog = (msg) => {
    console.log(`\x1b[31m ${msg} \x1b[0m`);
}

module.exports = { log, redlog };
