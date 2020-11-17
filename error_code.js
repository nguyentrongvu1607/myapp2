const i18n = require('i18n')
module.exports = {
  OutOfRankPodium: function(e) {
    return { code: 99, message: i18n.__('OutOfRankPodium'), data: e }
  },
  MissingParams: function(e) {
    return { code: 100, message: i18n.__('MissingParams'), data: e }
  },
  MessageWithoutTranslation:function(message){
    return { code: -1, message: message }
  },
  ValidUsername: { code: 101, message: i18n.__('ValidUsername') },
  InvalidUsername: { code: 102, message: i18n.__('InvalidUsername') },
  EmailInUse: { code: 103, message: i18n.__('EmailInUse'), field: 'email' },
  PasswordIncorrect: { code: 104, message: i18n.__('PasswordIncorrect') },
  PasswordNewMissing: { code: 105, message: i18n.__('PasswordNewMissing') },
  InvalidEmail: { code: 106, message: i18n.__('InvalidEmail'), field: 'email' },
  InvalidId: { code: 107, message: i18n.__('InvalidId') },
  InvalidPassword: { code: 108, message: i18n.__('InvalidPassword') },
  NotEmailFormat: {
    code: 109,
    message: i18n.__('NotEmailFormat'),
    field: 'email'
  },

  UserNotFound: { code: 201, message: i18n.__('UserNotFound') },
  UserBanned: { code: 202, message: i18n.__('UserBanned') },
  UserPermissionDeny: { code: 203, message: i18n.__('UserPermissionDeny') },
  ForgotPwdEmailRequired: {
    code: 205,
    message: i18n.__('ForgotPwdEmailRequired')
  },
  ForgotPwdTokenInvalid: {
    code: 206,
    message: i18n.__('ForgotPwdTokenInvalid')
  },
  ForgotPwdTokenExpired: {
    code: 207,
    message: i18n.__('ForgotPwdTokenExpired')
  },
  ForgotPwdHadChanged: { code: 207, message: i18n.__('ForgotPwdHadChanged') },

  CategoryNotFound: { code: 300, message: i18n.__('CategoryNotFound') },

  RejectOrderPermissionDeny: {
    code: 400,
    message: i18n.__(`You have don't permission to reject order`)
  },
  OrderCannotReject: { code: 401, message: i18n.__('Order cannot reject.') },
  OrderHadRejected: { code: 402, message: i18n.__('Order has been rejected.') },

  ItemNotFound: { code: 500, message: i18n.__('ItemNotFound') },
  LanguageNotFound: { code: 501, message: i18n.__('LanguageNotFound') },

  ErrorUnknown: function(e) {
    return { code: 900, message: i18n.__('ErrorUnknown'), detail: e }
  }
}
