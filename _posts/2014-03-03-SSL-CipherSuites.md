---
layout: post
title: SSL cipher suite discovery with OpenSSL
tags: openssl cipher ssl
year: 2014
month: 03
day: 03
published: false
summary: Quickly enumerate all SSL/TLS cipher suites supported by a server.
---
I recently had to perform a quick enumeration of cipher suites supported by a certain
server. Like the good man that I am, I immediately wrote a script to automate it in case I
need it in the future. Maybe you'll find it useful as well.

It's hastily written and quite hacky in at least two points:

* It does not support `-stdname`, which is _very_ useful to make sense of the results
  quickly. Note that the `-stdname` option is conditionally compiled in OpenSSL, so I
  didn't want to put effort into detection etc.
* No effort has been made to group / distinguish results by protocol version, so the
  output is quite dense

Here goes:

{% highlight bash %}
#!/usr/bin/env bash

SERVER=encrypted.google.com
PORT=443
DELAY=0 # No delay by default
VERBOSE=false # Print results on all ciphers by default

args=`getopt d:p:rs: $*`
if [ $? != 0 ] ; then
        echo 'Usage: list_ciphers.sh -d <delay> -s <server> -p <port> -r'
        exit 2
fi

while getopts d:p:s:v option ; do
        case "${option}" in
                s) SERVER="${OPTARG}" ;;
                p) PORT="${OPTARG}" ;;
                d) DELAY=${OPTARG} ;;
                v) VERBOSE=true ;;
        esac
done

# OpenSSL requires port number with the host:
SERVER="${SERVER}:${PORT}"

ciphers=$(openssl ciphers 'ALL:eNULL' | sed -e 's/:/ /g')

echo "Testing: ${SERVER}"
echo "Cipher list from: $(openssl version)"
echo

for cipher in ${ciphers[@]} ; do
    echo -n "Testing $cipher ... "
    result=$(echo -n | openssl s_client -debug -cipher "$cipher" -connect $SERVER < /dev/null 2>&1)
    if [[ "$result" =~ "Cipher is ${cipher}" ]] ; then
        echo YES
    else
        if [ "$VERBOSE" = false ] ; then echo -en "\r\033[K"; continue ; fi
    
        if [[ "$result" =~ ":error:" ]] ; then
            error=$(echo -n $result | cut -d':' -f6)
            echo "NO ($error)"
        else
            echo "Malformed response:" ; echo
            echo $result
        fi
    fi
    
    if [[ ! $DELAY == 0 ]] ; then
        sleep $DELAY
    fi
done
{% endhighlight %}

EOT
