const express = require("express");
const session = require("express-session");
const flash = require("connect-flash");
const passport = require("./passport"); // make sure configured
const { PrismaSessionStore } = require("@quixo3/prisma-session-store");
const prisma = require("./db");
const bcrypt = require("bcryptjs");
const upload = require("./middleware/upload")



const app = express();


app.set("view engine", "ejs");
app.use(express.urlencoded({ extended: false }));
app.use(express.static("public"));
app.use(flash());


app.use(
    session({
        secret: "cats",
        resave: false,
        saveUninitialized: false,
        store: new PrismaSessionStore(prisma, {
            checkPeriod: 2 * 60 * 1000,
            dbRecordIdIsSessionId: true,
        }),
    })
);

app.use(passport.initialize());
app.use(passport.session());


function checkAuthenticated(req, res, next) {
    if (req.isAuthenticated()) return next();
    res.redirect("/login");
}

function checkNotAuthenticated(req, res, next) {
    if (req.isAuthenticated()) return res.redirect("/");
    next();
}




app.get("/sign-up", checkNotAuthenticated, (req, res) => {
    res.render("signup", { error: null });
});

app.post("/sign-up", checkNotAuthenticated, async (req, res, next) => {
    try {
        const { firstName, lastName, email, password, confirmPassword } = req.body;

        if (!firstName || !lastName || !email || !password || !confirmPassword) {
            return res.render("signup", { error: "All fields are required." });
        }

        if (password !== confirmPassword) {
            return res.render("signup", { error: "Passwords do not match." });
        }

        const hashedPassword = await bcrypt.hash(password, 10);

        await prisma.user.create({
            data: { firstName, lastName, email, passwordHash: hashedPassword }
        });

        res.redirect("/login");
    } catch (error) {
        console.error(error);
        next(error);
    }
});


app.get("/login", checkNotAuthenticated, (req, res) => {
    res.render("login", { user: null, error: req.flash("error") });
});

app.post(
    "/login",
    checkNotAuthenticated,
    passport.authenticate("local", {
        successRedirect: "/",
        failureRedirect: "/login",
        failureFlash: true
    })
);


app.get("/logout", checkAuthenticated, (req, res, next) => {
    req.logout(err => {
        if (err) return next(err);
        res.redirect("/");
    });
});


app.get("/", async (req, res) => {
    let folders = [];
    if (req.user) {
        folders = await prisma.folder.findMany({
            where: { ownerId: req.user.id },
            orderBy: { createdAt: "desc" }
        });
    }
    res.render("index", {
        folders,
        user: req.user || null
    });

});


app.get("/folders", checkAuthenticated, (req, res) => {
    res.render("createFolder");
});

app.post("/folders", checkAuthenticated, async (req, res) => {
    const { name } = req.body;

    await prisma.folder.create({
        data: { name, ownerId: req.user.id }
    });

    res.redirect("/");
});

app.get("/folders/:id", checkAuthenticated, async (req, res) => {
    const id = req.params.id;

    const folder = await prisma.folder.findUnique({
        where: { id: id },
        include: { files: true }
    });
    res.render("folder", { folder })


})
app.get("/folders/:id/createfile", checkAuthenticated, async (req, res) => {
    const folder = await prisma.folder.findUnique({ where: { id: req.params.id } });
    res.render("files", { folder });
});
app.post("/folders/:id/delete", async (req, res) => {
    const folderId = req.params.id;
    await prisma.file.deleteMany({
        where: { folderId }
    });

    await prisma.folder.delete({
        where: { id: folderId }
    });
    res.redirect("/")
})
app.post("/folders/:folderId/files/:fileId/delete", checkAuthenticated, async (req, res) => {
    const { folderId, fileId } = req.params;
    await prisma.file.delete({
        where: { id: fileId }
    })
    res.redirect(`/folders/${folderId}`)
})
app.post("/folders/:folderId/files/:fileId/download", checkAuthenticated, async (req, res) => {
    const { fileId } = req.params;
    const file = await prisma.file.findUnique({
        where: { id: fileId }
    })
    res.download(file.storagePath, file.name)
})
app.post('/folders/:id/upload', upload.single('file'), checkAuthenticated, async (req, res) => {
    const { originalname, mimetype, size, filename } = req.file;
    await prisma.file.create({
        data: {
            folderId: req.params.id,
            ownerId: req.user.id,
            name: originalname,
            mimeType: mimetype,
            sizeBytes: size,
            storagePath: `uploads/${filename}`,
        },
    });
    res.redirect(`/folders/${req.params.id}`);
})
app.post("/folders/:id/edit", checkAuthenticated, async (req, res) => {
    const folderId = req.params.id;
    const { name } = req.body
    await prisma.folder.update({
        where: { id: folderId },
        data: { name }
    })
    res.redirect(`/folders/${folderId}`)
})
app.get("/folders/:id/edit", checkAuthenticated, async (req, res) => {
    const folderId = req.params.id;

    const folder = await prisma.folder.findUnique({
        where: { id: folderId }
    });



    res.render("editfolder", { folder });
});
app.listen(3000, () => console.log("Server running on http://localhost:3000"));
