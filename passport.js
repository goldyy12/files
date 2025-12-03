const passport = require("passport");
const LocalStrategy = require("passport-local").Strategy;
const bcrypt = require("bcryptjs");
const prisma = require("./db");


passport.use(
    new LocalStrategy(
        { usernameField: "email" }, // use email instead of username
        async (email, password, done) => {
            try {
                const user = await prisma.user.findUnique({
                    where: { email },
                });

                if (!user) {
                    return done(null, false, { message: "No user with that email" });
                }

                const isValid = await bcrypt.compare(password, user.passwordHash);
                if (!isValid) {
                    return done(null, false, { message: "Incorrect password" });
                }

                return done(null, user);
            } catch (err) {
                return done(err);
            }
        }
    )
);


passport.serializeUser((user, done) => {
    done(null, user.id);
});


passport.deserializeUser(async (id, done) => {
    try {
        const user = await prisma.user.findUnique({
            where: { id },
        });
        done(null, user);
    } catch (err) {
        done(err);
    }
});

module.exports = passport;
