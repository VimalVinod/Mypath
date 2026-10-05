const fs = require('fs');
let code = fs.readFileSync('src/pages/ProfilePage.tsx', 'utf8');

const importStatement = "import BOARDS from '../data/boards.json';\nimport UNIVERSITIES from '../data/universities.json';";

code = code.replace("import { statesAndDistricts } from '../data/statesAndDistricts';", "import { statesAndDistricts } from '../data/statesAndDistricts';\n" + importStatement);

const boardsStart = code.indexOf('const BOARDS = [');
const boardsEnd = code.indexOf('];', code.indexOf('Other University\'')) + 2;

if(boardsStart > -1 && boardsEnd > -1) {
    code = code.substring(0, boardsStart) + code.substring(boardsEnd);
}

fs.writeFileSync('src/pages/ProfilePage.tsx', code);
