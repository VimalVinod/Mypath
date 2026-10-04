const { splitSentences } = require('../../src/services/pdf');

const testCurlyDouble = '\u201CCandidates must apply by June.\u201D The official website is open.';
console.log('Current curly double output:');
console.log(splitSentences(testCurlyDouble));

const testCurlySingle = '\u2018Applications will close at midnight.\u2019 Please plan accordingly.';
console.log('Current curly single output:');
console.log(splitSentences(testCurlySingle));

const testStraightDouble = '"Candidates must apply by June." The official website is open.';
console.log('Current straight double output:');
console.log(splitSentences(testStraightDouble));

// Test with updated regex
const updatedRegex = /(?<=[.!?]["')\]\u201D\u2019]*)\s+(?=[A-Z0-9([“"'])/;
console.log('\nTesting simulated updated split on curly double:');
console.log(testCurlyDouble.split(updatedRegex));
console.log('Testing simulated updated split on curly single:');
console.log(testCurlySingle.split(updatedRegex));
