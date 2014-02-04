---
layout: post
title: Reversing Android applications Part II
tags: android monitoring mitm security burp
year: 2014
month: 2
day: 2
published: false
summary: Setting up a proxy for Google Android applications.
---

# WIP

One _particularly_ useful way of analysing applications is observing and manipulating their
behaviour at runtime. Generally speaking, the two most beneficial ways to accomplish this
are debuggers and network proxies - for yours truly anyways, your mileage may vary. Let's
first take a look at how we can set up a proxy for our (Android) applications.

We'll start by choosing a proxy to use. My go-to choice is the [Burp
Suite](http://portswigger.net/burp/) proxy, and this is the one I will use as an example
here as well.

Setting up the Burp proxy is particularly easy. After you've downloaded and launched it,
head to the `Proxy` tab and ...

+ `pushd /System/Library/Java/JavaVirtualMachines/1.6.0.jdk/Contents/Home/lib/ext/ && wget http://bouncycastle.org/download/bcprov-jdk16-141.jar && popd`

+ `adb pull /system/etc/security/cacerts.bks`

+ `keytool -keystore cacerts.bks -storetype BKS -provider org.bouncycastle.jce.provider.BouncyCastleProvider -storepass "" -importcert -trustcacerts -alias Portswigger -file PortSwiggerCA`

+ You will be presented with a prompt on whether to trust the PortSwigger certificate; type 'Yes'

+ `adb chmod 777 /system/etc/security/cacerts.bks`
+ `adb push cacerts.bks.modified /system/etc/security/cacerts.bks`
+ `adb chmod 644 /system/etc/security/cacerts.bks`
+ `cp /tmp/android-$USER/emulator-jxcLaF ~/.android/avd/devicename.avd/system.img`
+ Restart your emulator, pull the `cacerts.bks` and make sure it contains the PortSwigger
certificate.

The reason we chose this procedure is convenience; if we simply added our certificate
through Android's (before ICS) functionality, it would not persist across reboots (try
it).  Now the reason the above works is because we are moving the temporary copy
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
and instructing our emulator to use it by passing the parameter `-http-proxy
192.168.1.33:8080`
