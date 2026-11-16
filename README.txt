Aevy - local CPM script ecosystem
=================================
Open index.html in any modern browser. No build step, no server, no cloud.

Accounts     Sign up / sign in (js/auth.js). Passwords are salted and hashed
             (PBKDF2) on your device. Profiles: name, bio, password, delete.
Ownership    Every script stores its owner. Only the owner can edit, update,
             or delete it (checked in js/app.js before every change).
Privacy      Scripts are Public or Private. Private scripts are invisible to
             everyone except their owner. Others can only fork public ones.
Pages        #/publishers (directory), #/u/<username> (publisher page),
             #/profile (upload management), #/scripts (library + categories).
Data         localStorage only. "My files" and Backup cover only your scripts.

Limits       A browser-only app cannot truly lock data away: anyone with access
             to this browser profile and its dev tools can read or edit
             localStorage. The rules stop normal use, not a determined user.
             Use one browser profile per person on shared computers.
