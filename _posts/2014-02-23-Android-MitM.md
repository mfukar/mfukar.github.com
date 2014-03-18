---
layout: post
title: Reversing Android applications Part II
tags: android monitoring mitm security burp
year: 2014
month: 02
day: 23
published: true
summary: Setting up a proxy for Google Android applications.
---

# Passive and active monitoring

Actively monitoring an application's network activity is particularly advantageous: not
only can we look at what the app is doing, but also get to alter its communication, e.g.
by altering network responses to it and directly observe any effects this might have. This
way, we can analyse code paths of great depth inside the application, which we might not
have been able to do otherwise.

# and on Android?

One _particularly_ useful way of analysing applications is observing and manipulating
their behaviour at runtime. Generally speaking, the two most beneficial ways to accomplish
this are debuggers and network proxies - depending on the application, your mileage may
vary. Let's first take a look at how we can set up a proxy for our (Android) applications.

We'll start by choosing a proxy to use. My go-to choice is the [Burp
Suite](http://portswigger.net/burp/) proxy, and this is the one I will use as an example
here as well.

Setting up the Burp proxy is particularly easy. After you've downloaded and launched it, head
to the `Proxy` tab and then `Options`. You can set up your interface on `0.0.0.0` and port
to 80 if your want to intercept HTTP connections, or 443 for HTTPS, or any port you wish
to proxy on.

Edit your listener and choose the `Certificate` tab. Here you can specify what certificate
your want to use. Typically, when I'm analysing one app at a time I use the third option
"Generate a CA-signed certificate with a specific hostname" and I set up the hostname to
the one the application uses for communication. Now if you check "Support invisible
proxying" on the `Request Handling` tab, Burp will proxy all connections the application
makes over the port we specified. However, since Burp's certificate is not trusted, this
won't work; we need to add it to the trusted certificates list. To the command line!

1. `pushd /System/Library/Java/JavaVirtualMachines/1.6.0.jdk/Contents/Home/lib/ext/ && wget http://bouncycastle.org/download/bcprov-jdk16-141.jar && popd`

2. `adb pull /system/etc/security/cacerts.bks`

3. `keytool -keystore cacerts.bks -storetype BKS -provider org.bouncycastle.jce.provider.BouncyCastleProvider -storepass "" -importcert -trustcacerts -alias Portswigger -file PortSwiggerCA`

4. You will be presented with a prompt on whether to trust the PortSwigger certificate; type 'Yes'

5. `adb shell mount -o rw,remount -t yaffs2 /dev/block/mtdblock0 /system`, where
   `mtdblock0` is the appropriate device for your emulator instance.
5. `adb shell chmod 777 /system/etc/security/cacerts.bks`
6. `adb push cacerts.bks /system/etc/security/cacerts.bks`
7. `adb shell chmod 644 /system/etc/security/cacerts.bks`
8. `cp /tmp/android-$USER/emulator-jxcLaF ~/.android/avd/devicename.avd/system.img`
9. Restart your emulator, pull the `cacerts.bks` and make sure it contains the PortSwigger
certificate.

__[EDIT]__: I received a couple questions about point #1; in particular, what is the deal
with the ¡magic! path. That path is the value of `$JAVA_HOME/jre/lib/ext/` or on my system
(OS X) `$JAVA_HOME/Home/lib/ext/`. Its significance lies in that the JRE will look there
(unless your `$CLASSPATH` is modified) for providers.

Roughly, what we did is get the phone's trusted certificate store (`cacerts.bks`) and add
the PortSwigger certificate to it using keytool. Then we copied it back to the phone. The
only shady step is #9, which we'll explain in the next paragraph. The reason we chose this
procedure is convenience; if we simply added our certificate through Android's (before
ICS) functionality, it would not persist across reboots (try it).

Now the reason the procedure above worked is because we are moving the temporary copy
`emulator-[\d{6}]` to `system.img`. If you want this to be scriptable, which will prove
useful in the future, read the answers to [this StackOverflow
question](http://stackoverflow.com/questions/15417105/forcing-the-android-emulator-to-store-changes-to-system)
which detail a step-by-step procedure to follow.

From Ice Cream Sandwich and onwards, we do not need to perform the above. Instead, we can
add any certificate through Settings (`Settings-> Security-> Credential Storage ->
[Install from storage]`). This renders the aforementioned procedure redundant (finally),
and the added certs persist across reboots, as the store is on `/data` partition, and more
specifically at `/data/misc/keychain/cacerts-added`.

Now we are able to verify our proxy works by setting it up, say at `192.168.1.33:8080`,
and instructing our emulator to use it by passing the parameter `-http-proxy 192.168.1.33:8080`
Do note that this method only works for applications which respect the proxy values in
Java's `System` class or the default Android implementation of the `ProxySelector`.

That's all! Next up, we'll have a look in our application's internals with various
debuggers.
