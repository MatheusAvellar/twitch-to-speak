const readline = require("readline");
const tmi = require("tmi.js");
const say = require("say");
const MAX_SIZE = 200;
let CHANNEL;
let USERNAME;
let TOKEN;

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

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

// Awfully ugly, but apparently the way to do it:
// https://stackoverflow.com/a/38718053/4824627
rl.question("Username: ", (uname) => {
    rl.question("OAuth Token: ", (oauth) => {
        rl.question("Channel: ", (chan) => {
            USERNAME = uname.trim();
            TOKEN = oauth.trim();
            CHANNEL = chan.trim();
            rl.close();
            init();
        });
    });
});


function init() {
    let options = {
        options: {
            debug: false
        },
        connection: {
            cluster: "aws",
            reconnect: true
        },
        identity: {
            username: USERNAME,
            password: TOKEN
        },
        channels: [
            CHANNEL
        ]
    };

    let nicknames = {};

    let client = new tmi.client(options);
    client.connect();

    // TODO: Include /me
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

        if(message.indexOf("!stop") === 0
        && (user.mod || user.username === "matthazelnut")) {
            say.stop();
        } else if(message.indexOf("!say ") === 0) {

            if(message.length > MAX_SIZE + 5) return;
            let nick = nicknames[user.username];

            tts(message.slice(5), (nick ? nick : user.username) + " said:");

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
        }
    });

    client.on("cheer", function (channel, userstate, message) {
        console.log(userstate);
        tts(message.slice(5), user.username + " sent " + userstate.bits + " bits and said:");
    });

    client.on("connected", function(addr, port) {
        console.log("Connected on " + addr + ":" + port);
    });

    function remove_repeated_words(str) {
        let counts = {};

        str.match(/\w+/g).forEach(function(w) {
            w = w.toLowerCase();
            counts[w] = (counts[w] || 0) + 1;
        });

        for(let i in counts) {
            if(counts[i] >= 8)
                str = str.replace(new RegExp(i, "gi"), "").trim();
        }

        return str;
    }

    function remove_repeated_chars(str) {
        let matches = str.match(/([A-z0-9])\1{7,}/gi);
        if(!matches) return str;
        for(let i = 0; i < matches.length; i++) {
            let repeated = matches[i].charAt(0);
            str = str.split(matches[i]).join(repeated);
        }
        return str;
    }

    function tts(msg, from) {
        msg = remove_repeated_chars(msg);
        msg = remove_repeated_words(msg);

        if(msg.length <= 0) {
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

        say.speak(msg);
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
}