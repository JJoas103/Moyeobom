const passport = require('passport');
const LocalStrategy = require('passport-local').Strategy;
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const NaverStrategy = require('passport-naver-v2').Strategy;
const bcrypt = require('bcrypt');
const userService = require('../services/userService');

// 로컬 로그인
passport.use(new LocalStrategy({
    usernameField: 'email',
    passwordField: 'password'
}, async (email, password, done) => {
    try {
        const user = await userService.findUserByEmail(email);
        if (!user) return done(null, false, { message: '이메일 또는 비밀번호가 일치하지 않습니다' });
        
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) return done(null, false, { message: '비밀번호가 일치하지 않습니다' });
        
        return done(null, user);
    } catch (error) {
        return done(error);
    }
}));
// 구글/네이버 로그인 성공/신규가입 판별 로직
async function googleVerify(accessToken, refreshToken, profile, done) {
    try {
        const email = profile.emails[0].value;
        let user = await userService.findUserByEmail(email);

        if (user) {
            return done(null, user);
        } else {
            // 사용자가 없으면 소셜 정보만 전달 (DB 저장 안함)
            return done(null, false, {
                type: 'social_new',
                socialData: {
                    email,
                    nickname: profile.displayName,
                    profileImage: profile.photos[0].value,
                    provider: 'google'
                }
            });
        }
    } catch (error) {
        return done(error);
    }
}

async function naverVerify(accessToken, refreshToken, profile, done) {
    try {
        const email = profile.email;
        let user = await userService.findUserByEmail(email);

        if (user) {
            return done(null, user);
        } else {
            // 사용자가 없으면 소셜 정보만 전달
            return done(null, false, {
                type: 'social_new',
                socialData: {
                    email,
                    nickname: profile.nickname,
                    profileImage: profile.profileImage,
                    provider: 'naver'
                }
            });
        }
    } catch (error) {
        return done(error);
    }
}

// 소셜 전략은 키가 있을 때만 등록한다.
//
// passport-oauth2 는 clientID 가 비어 있으면 생성 시점에 바로 예외를 던진다. 이 파일은
// app.js 가 require 하는 자리라, 그러면 서버가 아예 뜨지 않는다. 소셜 로그인을 안 쓰는
// 상황(.env 를 아직 안 채운 새 팀원, 행사 화면만 띄워 확인할 때)에서도 서버는 떠야 하므로
// 키가 없으면 건너뛰고 알려만 준다.
//
// 키를 채우면 그때부터 지금과 똑같이 동작한다 — 등록 조건만 붙였고 내용은 그대로다.
// 등록되지 않은 전략으로 /auth/google 에 들어가면 passport 가 "Unknown strategy" 로
// 받으므로, 로그인 화면에서 소셜 버튼을 누르면 500 이 난다. 키를 넣는 것이 정답이다.

if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
    // 구글 전략
    passport.use(new GoogleStrategy({
        clientID: process.env.GOOGLE_CLIENT_ID,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET,
        callbackURL: "/auth/google/callback"
    }, googleVerify));

    // 리액트 구글 전략
    passport.use('google-api', new GoogleStrategy({
        clientID: process.env.GOOGLE_CLIENT_ID,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET,
        callbackURL: "/api/auth/google/callback"
    }, googleVerify));
} else {
    console.warn('[passport] GOOGLE_CLIENT_ID 가 없어 구글 로그인을 건너뜁니다');
}

if (process.env.NAVER_CLIENT_ID && process.env.NAVER_CLIENT_SECRET) {
    // 네이버 전략
    passport.use(new NaverStrategy({
        clientID: process.env.NAVER_CLIENT_ID,
        clientSecret: process.env.NAVER_CLIENT_SECRET,
        callbackURL: "/auth/naver/callback"
    }, naverVerify));

    // 리액트 네이버 전략
    passport.use('naver-api', new NaverStrategy({
        clientID: process.env.NAVER_CLIENT_ID,
        clientSecret: process.env.NAVER_CLIENT_SECRET,
        callbackURL: "/api/auth/naver/callback"
    }, naverVerify));
} else {
    console.warn('[passport] NAVER_CLIENT_ID 가 없어 네이버 로그인을 건너뜁니다');
}

passport.serializeUser((user, done) => done(null, user.id));
passport.deserializeUser(async (id, done) => {
    try {
        const user = await userService.findUserById(id);
        done(null, user);
    } catch (error) {
        done(error);
    }
});

module.exports = passport;
