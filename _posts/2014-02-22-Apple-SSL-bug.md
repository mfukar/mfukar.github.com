---
layout: post
title: Apple's SSL/TLS bug
tags: [apple, ssl, certificate, vulnerability, goto-fail]
year: 2014
month: 02
day: 22
published: true
summary: Outreach of an SSL certificate verification bug.
---
# The story

On 21/2/2014, Apple pushed a [security update](http://support.apple.com/kb/HT6147) for iOS
with a rather scary description:

> Description: Secure Transport failed to validate the authenticity of the connection.

My Twitter timeline was already up in arms before I had a chance to view the description,
at which point I mentioned it to a colleague. I added it was issued for iOS 6 _and_ 7,
and he wondered, prophetically: "_Did they fuck SSL up?_".

Earlier in the day, we'd spotted the bug in Safari but we were fooled, handwaving its
origin to network misconfiguration in an attempt to get out of the office by 17:00. :(

# The bug

As you probably have already read in other places by now, the bug is this:

{% highlight c %}
static OSStatus
SSLVerifySignedServerKeyExchange(SSLContext *ctx, bool isRsa, SSLBuffer signedParams,
                                 uint8_t *signature, UInt16 signatureLen)
{
    OSStatus        err;
    ...

    if ((err = SSLHashSHA1.update(&hashCtx, &serverRandom)) != 0)
        goto fail;
    if ((err = SSLHashSHA1.update(&hashCtx, &signedParams)) != 0)
        goto fail;
        goto fail;
    if ((err = SSLHashSHA1.final(&hashCtx, &hashOut)) != 0)
        goto fail;
    ...

fail:
    SSLFreeBuffer(&signedHashes);
    SSLFreeBuffer(&hashCtx);
    return err;
}
{% endhighlight %}

Notice the two `goto fail;` statements in a row. The second will always jump to the end of
the function, returning the value of `err`, which signals a successful operation.

The amount of things that went wrong here seems near incredible to me:

* Earlier in the [same
  file](http://opensource.apple.com/source/Security/Security-55471/libsecurity_ssl/lib/sslKeyExchange.c),
  you can see the author(s) defensively using brackets around a single statement in an
  `if` block. I know it's hard to get a big group of people to use a convention, but come
  on.
* If Apple is using clang to compile their own code, there's an option to warn on
  unreachable code (aptly named `-Wunreachable-code`). Maybe somebody ignored it. Maybe
  somebody thought it's included in `-Wall`, but it isn't - and that's undocumented.
* Maybe nobody never even saw the code. I'll be the first to admit hindsight is 20/20, yet
  this is still easy to catch the eye in a code review, for two reasons:

    + It's not subtle. It stands out both in style and intent.
    + The error checking is not idiomatic for C. Typically, one connects the statements
      with `else if` blocks to further protect against this sort of thing - in which case
      the compiler would've failed to parse the subsequent `else` or `else if` statement
      even without `-Werror`.
    + Additionally, it's not subtle in behaviour, either. Unless I'm missing something,
      which I might because I'm already on my way to Saturday night intoxication, a test
      which supplies a certificate with an invalid ephemeral key signature (the code is
      used in DHE & ECDHE cipher suites) to a client and checks for acceptance can spot
      it. Does that sound right?

* The commit that introduced it seems like it copy/pasted the `goto fail;` line there,
  possibly by accident. If someone skimmed through the patch it's quite unlikely they
  wouldn't wonder about its presence.

More than anything, this makes me rethink about the tools people trust to do their jobs
every day. I know for a fact acceptance testing in certain organizations uses typical
browsers like Chrome, Safari, Firefox and the like to test features and security
requirements such as: "The URL to this and that should be an HTTPS one exclusively, and
yadda yadda". Is it perhaps "too trusting" to assume those tools are doing their job
right? Acceptance testing is one thing; perhaps QA or security testing would test this
with something like [TLSLite](https://github.com/trevp/tlslite).

At any rate, I guess we'll all have a full Monday with this one. Take care.
