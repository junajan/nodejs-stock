# connect-file-store


## Installation

    npm install connect-file-store


## Options

    - `path` storage path (optional, default: process.env.TMPDIR) 
    - `prefix` filename prefix (optional, default: `file-store-`)
    - `useAsync` use asynchronous file operations (optional, default: false)
    - `reapInterval` interval between removing stale sessions (optional, default: 600000 (10 mins), disable: -1 )
    - `maxAge` maximum age of sessions before removal (optional, default: 600000*3 (30 mins) )

## Example

See example/app.js

With express:

    var connect = require('connect')
      , FileStore = require('connect-session-file')(connect);

    app.use(express.session({
      secret: settings.cookie_secret,
      store: new FileStore({
        path:'.',
        useAsync:true,
        reapInterval: 5000,
        maxAge: 10000
      })
    }));


## Tests

## License 

(The MIT License)

Copyright (c) 2013 jKey Lu &lt;jkeylu@gmail.com&gt;

Permission is hereby granted, free of charge, to any person obtaining
a copy of this software and associated documentation files (the
'Software'), to deal in the Software without restriction, including
without limitation the rights to use, copy, modify, merge, publish,
distribute, sublicense, and/or sell copies of the Software, and to
permit persons to whom the Software is furnished to do so, subject to
the following conditions:

The above copyright notice and this permission notice shall be
included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED 'AS IS', WITHOUT WARRANTY OF ANY KIND,
EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT.
IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY
CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT,
TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE
SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.