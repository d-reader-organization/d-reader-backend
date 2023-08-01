import { QuestionSet, Question } from 'nest-commander';

@QuestionSet({ name: 'login-user' })
export class LoginUserQuestions {
  @Question({
    type: 'input',
    name: 'nameOrEmail',
    message: 'Username or email?',
    validate: function (value: string) {
      if (!value) return 'Please input a username or email';
      else return true;
    },
  })
  parseNameOrEmail(nameOrEmail: string): string {
    return nameOrEmail;
  }

  @Question({
    type: 'input',
    name: 'password',
    message: 'Password?',
    validate: function (value: string) {
      if (!value) return 'Please input a password';
      else return true;
    },
  })
  parsePassword(password: string): string {
    return password;
  }
}
