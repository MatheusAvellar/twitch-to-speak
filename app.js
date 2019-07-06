const readline = require("readline");
const tmi = require("tmi.js");
const say = require("say");
const fs = require("fs");
const MAX_SIZE = 200;
const COLORS = {
    Reset: "\x1b[0m",
    FBlack: "\x1b[30m",
    FRed: "\x1b[31m",
    FGreen: "\x1b[32m",
    FYellow: "\x1b[33m",
    FBlue: "\x1b[34m",
    FMagenta: "\x1b[35m",
    FCyan: "\x1b[36m",
    FWhite: "\x1b[37m",
    BBlack: "\x1b[40m",
    BRed: "\x1b[41m",
    BGreen: "\x1b[42m",
    BYellow: "\x1b[43m",
    BBlue: "\x1b[44m",
    BMagenta: "\x1b[45m",
    BCyan: "\x1b[46m",
    BWhite: "\x1b[47m"
};
const SWEAR_DICT = [
    {
        match: /f(u|o)ck(er|ing?)?/gi,
        with: ["fug", "fuggles", "banana"]
    },
    {
        match: /shia?t/gi,
        with: ["shizzle", "shiz", "shwabble"]
    },
    {
        match: /c(o|u)ck/gi,
        with: ["cog", "color", "penguin"]
    },
    {
        match: /dick/gi,
        with: ["banana", "flower", "bee movie"]
    },
    {
        match: /bia?tch/gi,
        with: ["bro", "banana", "gorgeous woman"]
    },
    {
        match: /cunt/gi,
        with: ["cutesy", "cutesypants", "lovely person"]
    },
    {
        match: /fag(g?(ot|it))?/gi,
        with: ["friend", "pal", "bro"]
    }
];
console.log("\n");

let json = require("./ttsconfig.json");
if(!json) {
    fallback();
} else {
    if("username" in json
    && "token" in json
    && "channel" in json) {
        if(!("commands" in json))
            json.commands = true;

        color([{
            bg: ["", 0],
            fg: ["FGreen", 0],
            msg: " Loaded config file! "
        }]);

        color([{
            bg: ["", 0],
            fg: ["", 0],
            msg: " Joining as "
        },{
            bg: ["", 0],
            fg: ["FCyan", 0],
            msg: json.username
        },{
            bg: ["", 0],
            fg: ["", 0],
            msg: " on channel "
        },{
            bg: ["", 0],
            fg: ["FCyan", 0],
            msg: "/" + json.channel + "\n"
        }]);

        init(json);
    } else {
        fallback();
    }
}

function fallback() {
    console.log("Config file not found!\n");

    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout
    });

    // Awfully ugly, but apparently the way to do it:
    // https://stackoverflow.com/a/38718053/4824627
    rl.question("Username: ", (uname) => {
        rl.question("OAuth Token: ", (oauth) => {
            rl.question("Channel: ", (chan) => {
                let username = uname.trim();
                let token = oauth.trim();
                let channel = chan.trim();
                rl.close();
                init({
                    username: username,
                    token: token,
                    channel: channel,
                    commands: true
                });
            });
        });
    });
}

function color(msg) {
    let out = COLORS["Reset"];
    for(let i = 0; i < msg.length; i++) {
        if(msg[i].bg[0].length > 0) {
            if(msg[i].bg[1]) {
                out += COLORS[msg[i].bg[0]].split("[").join("[1;");
            } else {
                out += COLORS[msg[i].bg[0]];
            }
        }

        if(msg[i].fg[0].length > 0) {
            if(msg[i].fg[1]) {
                out += COLORS[msg[i].fg[0]].split("[").join("[1;");
            } else {
                out += COLORS[msg[i].fg[0]];
            }
        }

        out += msg[i].msg;
        out += COLORS["Reset"];
    }
    console.log(out);
}

function init(settings) {
    let options = {
        options: {
            debug: false
        },
        connection: {
            cluster: "aws",
            reconnect: true
        },
        identity: {
            username: settings.username,
            password: settings.token
        },
        channels: [
            settings.channel
        ]
    };

    let reading = false;

    let nicknames = {};

    let to_read = [];

    let client = new tmi.client(options);
    client.connect();

    // Regular chat
    client.on("chat", function(channel, user, message, self) {
        if(self) return;

        color([{
            bg: ["BWhite", 0],
            fg: ["FBlack", 0],
            msg: " " + user.username + " "
        },{
            bg: ["", 0],
            fg: ["", 0],
            msg: " " + message
        }]);

        if(!settings.commands) {
            if(message.indexOf("!") === 0
            || message.length > MAX_SIZE + 5) return;

            let nick = nicknames[user.username];
            queue_read([message/*.slice(5)*/, (nick ? nick : user.username) + " said:"]);
        } else {
            if(message.indexOf("!stop") === 0 && user.mod) {
                say.stop();
            } else if(message.indexOf("!say ") === 0) {

                let nick = nicknames[user.username];

                queue_read([message.slice(5), (nick ? nick : user.username) + " said:"]);

            } else if(message.indexOf("!nick ") === 0) {
                let nick = message.slice(6).replace(/[^A-z0-9 ]/g, "");
                if(nick.length > 1 && nick.length < 16) {
                    nicknames[user.username] = nick;
                    color([{
                        bg: ["BGreen", 0],
                        fg: ["FBlack", 0],
                        msg: " Nickname "
                    }, {
                        bg: ["", 0],
                        fg: ["FGreen", 0],
                        msg: " " + nick + " is now an alias for " + user.username
                    }]);
                }
            } else if(message.indexOf("!unnick ") === 0 && user.mod) {
                let uname = message.slice(8);
                if(uname.charAt(0) === '@')
                    uname = uname.slice(1);

                if(uname in nicknames) {
                    delete nicknames[uname]
                    color([{
                        bg: ["BGreen", 0],
                        fg: ["FBlack", 0],
                        msg: " Nickname "
                    }, {
                        bg: ["", 0],
                        fg: ["FGreen", 0],
                        msg: " Removed " + uname + "'s nickname"
                    }]);
                } else {
                    color([{
                        bg: ["BGreen", 0],
                        fg: ["FBlack", 0],
                        msg: " Nickname "
                    }, {
                        bg: ["", 0],
                        fg: ["FGreen", 0],
                        msg: " " + uname + " has no nickname"
                    }]);
                }
            }
        }
    });

    client.on("action", function (channel, userstate, message, self) {
        if(self) return;

        if(message.length > MAX_SIZE + 5) return;
        let nick = nicknames[user.username];

        queue_read([message/*.slice(5)*/, (nick ? nick : user.username) + " said:"]);
    });

    client.on("cheer", function (channel, userstate, message) {
        if(message.length > MAX_SIZE + 5) return;

        let nick = nicknames[userstate.username];

        if(message.length > 0)
            queue_read([
                message,
                (nick ? nick : userstate.username) + " sent " + userstate.bits + " bits, and said:"
            ]);
        else
            queue_read([
                message,
                (nick ? nick : userstate.username) + " sent " + userstate.bits + " bits"
            ]);
    });

    client.on("connected", function(addr, port) {
        console.log("Connected on " + addr + ":" + port);
    });

    function remove_repeated_words(str) {
        let counts = {};

        const words = str.match(/\w+/g);
        if(!words)
            return str;

        words.forEach(function(w) {
            w = w.toLowerCase();
            counts[w] = (counts[w] || 0) + 1;
        });

        for(let i in counts) {
            if(counts[i] >= 6)
                str = str.replace(new RegExp(i, "gi"), "").trim();
        }

        return str;
    }

    function remove_repeated_chars(str) {
        const matches = str.match(/(.)\1{6,}/gi);
        if(!matches) return str;
        for(let i = 0; i < matches.length; i++) {
            let repeated = matches[i].charAt(0);
            str = str.split(matches[i]).join(repeated);
        }
        return str;
    }

    function remove_links(str) {
        const regex = /(?:(?:https?|ftp|file):\/\/|www\.|ftp\.)(?:\([-A-Z0-9+&@#\/%=~_|$?!:,.]*\)|[-A-Z0-9+&@#\/%=~_|$?!:,.])*(?:\([-A-Z0-9+&@#\/%=~_|$?!:,.]*\)|[A-Z0-9+&@#\/%=~_|$])/igm;
        return str.replace(regex, "(link)");
    }

    function remove_swears(str) {
        for(let i = SWEAR_DICT.length - 1; i >= 0; i--) {
            const matches = str.match(SWEAR_DICT[i].match);
            if(!matches) continue;
            const replacements = SWEAR_DICT[i].with;
            str = str.replace(
                str.match(SWEAR_DICT[i].match),
                replacements[~~(Math.random()*replacements.length)]
            );
        }
        return str;
    }

    function tts(ar) {
        reading = true;

        let msg = ar[0];
        let from = ar[1];

        msg = remove_links(msg);
        msg = remove_repeated_chars(msg);
        msg = remove_repeated_words(msg);
        msg = remove_swears(msg);

        if(msg.length <= 0
        || (msg.length < 3 && msg.replace(/[^A-z0-9 ]+/gi, "").length <= 0)) {
            let gorgeous = [
                "Keep up the good work!",
                "You are beautiful!",
                "Loving the stream!",
                "Great run!",
                "You are by far the best streamer on Twitch",
                "Yes but how many feathers does an ostrich have?"
            ];
            msg = gorgeous[~~(Math.random() * gorgeous.length)];
        }

        if(from)
            msg = from + " " + msg;

        color([{
            bg: ["BYellow", 0],
            fg: ["FBlack", 0],
            msg: " Speaking "
        }, {
            bg: ["", 0],
            fg: ["FYellow", 0],
            msg: " " + msg
        }]);

        say.speak(msg, null, null, done_speaking);
    }

    function queue_read(msg) {
        if(!reading)
            tts(msg);
        else
            to_read.push(msg);
    }

    function done_speaking() {
        if(to_read.length > 0)
            tts(to_read.shift());
        else
            reading = false;
    }
}