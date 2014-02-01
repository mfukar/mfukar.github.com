---
layout: post
title: Reversing Android applications, part 1: Analysing
tags: android reversing java dex security
year: 2014
month: 2
day: 1
published: true
summary: reversing android apps
---

_Obligatory quote taken from Sun Tzu's "The Art of War"_.

Opening paragraph which draws parallels between aforementioned quote and application
security, containing at least one capitalised acronym, und mentioning "NSA" getting your
pale white ass, if at all possible.

We shall take on the role of a developer, who wishes to review their Android application
in order to verify its security controls, the protection measures they have implemented,
and generally, the proper operation of the universe. Of course, someone might also want to
reverse an Android application for fun or profit. If you belong in the former category,
run. Seriously, just go for a run. The endorphin high can not compare with the merciless
torture Google's OS can - and undoubtedly will - inflict upon your unsuspecting soul. If
you belong in the latter category, I can only hope this activity either nets you a serious
amount of cash, or you will learn from other people's collective mistakes.

At any rate, an attacker can obtain our application as well, so we need to know what kind
of information we are feeding them as part of our normal mode of operation. Does it
include sensitive information? Can they easily spot bugs in our code? Is it easy to
circumvent our security controls and manipulate our app's users?

We can answer all those questions by reversing the application we have uploaded onto
Google Play store. How to do that, you say? Here is how:

**DISCLAIMER**: I am neither endorsing not suggesting I have reviewed the tools mentioned
below. Other tools may be more appropriate for your purposes.

1. Download the [Android SDK (Eclipse/ADT)](http://developer.android.com/sdk/index.html) and unzip it
2. Download [dex2jar](http://code.google.com/p/dex2jar/) and unzip it
3. Download [JD-GUI](http://jd.benow.ca/) and unzip it
4. If you have an Android device which you'll use:
    + Connect your Android device to your laptop/desktop
    + Install [APK Extractor](https://play.google.com/store/apps/details?id=net.sylark.apkextractor) on your Android device
    + Download your target application from Google Play
    + Run APK Extractor to send the `.apk` file to your laptop/desktop

5. If you do not have an Android device, and since you are the application developer, you
   can grab the `.apk` straight from the source, by building your application
6. In Eclipse/ADT, click File > New > Java Project
7. Name your project, then click Finish
8. Right click on the project in the Project Navigator, and select Build Path > Configure
   Build Path
9. In the Libraries tab, select "Add External JARs", browse to the directory where you
   unzipped `dex2jar`, select all the `.jar` files, and click Open > OK
10. Drag your `.apk` file into the Eclipse/ADT project (choose Copy Files > OK)
11. Right click on your project, then click Run As > Run Configurations
12. Right click on Java Application, then click New
13. Set Project to the same name you assigned to your project
14. Set Main class to `com.googlecode.dex2jar.v3.Main`
15. Go to the "Arguments" tab, and type the name of the .apk file in the field Program arguments
16. Click Run. Now a `.jar` file is created in your project workspace directory. You can
    find it by right-clicking your project and selecting Properties > Resource > Location
17. Run `JD-GUI` and point it to the `.jar` file
18. Et voila, Java code!

Now, you will observe this is not the usual verbose Java code we write. It will be filled
with generic names like `a`, `b`, `aa`, `ab` and so forth, and sometimes no Java code will
be presented at all. This may be the result of an obfuscator, or simply bug(s) in the
decompiler. Sometimes particularly weird constructs will be presented to you:

{% highlight java %}
if (!(paramObject instanceof h));
h localh;
label42: 
do
{
    do
    {
        do
        {
            return false;
            localh = (h)paramObject;
        }
        while (!this.b.equals(localh.b));
        if (this.a != null)
            break;
    }
    while (localh.a != null);
    if (this.c != null)
        break label75;
}
while (localh.c != null);
{% endhighlight %}

which will definitely need a little more than a glance to figure out. Nevertheless, if an
attacker can do it, damn it, so can we.

In our next post(s), we will get into the subject of what we can do with a decompiled
`.apk`, and how to examine it in other ways for information which can prove useful to
attackers. Then, we will see how to monitor an application's activity, primarily on the
network. Lastly, we will see what we can do to protect ourselves, our fellow Android
device owners and (hopefully) our customers.
