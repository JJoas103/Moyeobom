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

// 구글 전략
passport.use(new GoogleStrategy({
    clientID: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackURL: "/auth/google/callback"
}, googleVerify));

// 네이버 전략
passport.use(new NaverStrategy({
    clientID: process.env.NAVER_CLIENT_ID,
    clientSecret: process.env.NAVER_CLIENT_SECRET,
    callbackURL: "/auth/naver/callback"
}, naverVerify));

// 리액트 구글 전략
passport.use('google-api', new GoogleStrategy({
    clientID: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackURL: "/api/auth/google/callback"
}, googleVerify));

// 리액트 네이버 전략
passport.use('naver-api', new NaverStrategy({
    clientID: process.env.NAVER_CLIENT_ID,
    clientSecret: process.env.NAVER_CLIENT_SECRET,
    callbackURL: "/api/auth/naver/callback"
}, naverVerify));

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
