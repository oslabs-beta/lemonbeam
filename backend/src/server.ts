// The ONLY file allowed to call app.listen(). Everything the app *does*
// lives in app.ts; this file is only responsible for actually running it
// as a live process. Test files import app.ts directly and never touch
// this file, so running the test suite never opens a real port.
import dotenv from "dotenv";
dotenv.config();

import app from "./app.js";

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});