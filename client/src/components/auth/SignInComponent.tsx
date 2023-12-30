import React from 'react';

import {
  LoRDraftClientSocket,
  LoginCred,
  RegisterInfo,
} from 'common/game/socket-msgs';

import { Button } from 'client/components/common/button';
import { useLoRDispatch } from 'client/store/hooks';
import { doRegisterAsync, loginUser } from 'client/store/session';
import { APP_TITLE } from 'client/utils/constants';

interface RegisterComponentProps {
  registerFn: (register_info: RegisterInfo) => void;
}

function RegisterComponent(props: RegisterComponentProps) {
  const [username, setUsername] = React.useState<string>('');
  const [password, setPassword] = React.useState<string>('');
  const [email, setEmail] = React.useState<string>('');

  return (
    <div>
      <input
        value={username}
        onChange={(change_event) => {
          setUsername(change_event.target.value);
        }}
      />
      <input
        type='password'
        value={password}
        onChange={(change_event) => {
          setPassword(change_event.target.value);
        }}
      />
      <input
        value={email}
        onChange={(change_event) => {
          setEmail(change_event.target.value);
        }}
      />
      <Button
        onClick={() => {
          if (username.length > 0 && password.length > 0) {
            props.registerFn({
              username: username,
              password: password,
              email: email,
            });
          }
        }}
      >
        Register
      </Button>
    </div>
  );
}

interface LoginComponentProps {
  toRegisterFn: () => void;
  loginFn: (login_cred: LoginCred) => void;
}

function LoginComponent(props: LoginComponentProps) {
  const [username, setUsername] = React.useState<string>('');
  const [password, setPassword] = React.useState<string>('');

  return (
    <div>
      <input
        value={username}
        onChange={(change_event) => {
          setUsername(change_event.target.value);
        }}
      />
      <input
        type='password'
        value={password}
        onChange={(change_event) => {
          setPassword(change_event.target.value);
        }}
      />
      <Button
        onClick={() => {
          props.loginFn({ username: username, password: password });
        }}
      >
        Log in
      </Button>
      <Button onClick={props.toRegisterFn}>Register</Button>
    </div>
  );
}

interface SessionComponentProps {
  socket: LoRDraftClientSocket;
}

export const enum SignInState {
  LOGIN = 'LOGIN',
  REGISTER = 'REGISTER',
}

export function SignInComponent(props: SessionComponentProps) {
  const [signInState, setSignInState] = React.useState<SignInState>(
    SignInState.LOGIN
  );
  const dispatch = useLoRDispatch();

  const socket = props.socket;

  switch (signInState) {
    case SignInState.REGISTER: {
      return (
        <RegisterComponent
          registerFn={(register_info) => {
            dispatch(doRegisterAsync({ socket, registerInfo: register_info }));
            setSignInState(SignInState.LOGIN);
          }}
        />
      );
    }
    case SignInState.LOGIN: {
      const loginFn = (login_cred: LoginCred) => {
        loginUser(dispatch, { socket, loginInfo: login_cred });
      };

      const autoLogin = async () => {
        const username = 'test';
        const password = 'test';
        const email = 'test@mail.com';

        await dispatch(
          doRegisterAsync({
            socket,
            registerInfo: { username, password, email },
          })
        );
        loginUser(dispatch, { socket, loginInfo: { username, password } });
      };

      return (
        <div>
          <p>You need an Account to use {APP_TITLE}</p>
          <Button onClick={autoLogin}>Auto login</Button>
          <LoginComponent
            toRegisterFn={() => {
              setSignInState(SignInState.REGISTER);
            }}
            loginFn={loginFn}
          />
        </div>
      );
    }
  }
}
