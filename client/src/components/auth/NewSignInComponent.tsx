import LockOpenIcon from '@mui/icons-material/LockOpen';
import LockPersonIcon from '@mui/icons-material/LockPerson';
import Avatar from '@mui/material/Avatar';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Checkbox from '@mui/material/Checkbox';
import Container from '@mui/material/Container';
import CssBaseline from '@mui/material/CssBaseline';
import FormControlLabel from '@mui/material/FormControlLabel';
import Grid from '@mui/material/Grid';
import Link from '@mui/material/Link';
import TextField from '@mui/material/TextField';
import Typography, { TypographyProps } from '@mui/material/Typography';
import React from 'react';

import {
  LoRDraftClientSocket,
  LoginCred,
  RegisterInfo,
} from 'common/game/socket-msgs';
import { isOk } from 'common/util/status';

import { useLoRDispatch } from 'client/store/hooks';
import { loginUser, registerUser } from 'client/store/session';

function Copyright(props: TypographyProps) {
  return (
    <Typography
      variant='body2'
      color='text.secondary'
      align='center'
      {...props}
    >
      {'Copyright © '}
      <Link color='inherit' href='#'>
        LoRDraftKingdom
      </Link>{' '}
      {new Date().getFullYear()} {'.'}
    </Typography>
  );
}

interface LoginComponentProps {
  socket: LoRDraftClientSocket;
  toRegisterFn: () => void;
}

function LoginComponent({ socket, toRegisterFn }: LoginComponentProps) {
  const dispatch = useLoRDispatch();
  const [errorMessage, setErrorMessage] = React.useState<string | null>(null);

  const loginFn = async (loginInfo: LoginCred) => {
    const res = await loginUser(dispatch, { socket, loginInfo });

    if (!isOk(res)) {
      console.log(res);
      setErrorMessage(res.message);
    }
  };

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setErrorMessage(null);

    const data = new FormData(event.currentTarget);
    const username = data.get('username')?.toString();
    const password = data.get('password')?.toString();
    if (username !== undefined && password !== undefined) {
      loginFn({ username, password });
    }
  };

  const handleSignUp = (event: React.MouseEvent) => {
    event.preventDefault();
    toRegisterFn();
  };

  return (
    <React.Fragment>
      {errorMessage !== null ? (
        <Box sx={{ color: 'error.main', fontStyle: 'italic' }}>
          {errorMessage.toLowerCase()}
        </Box>
      ) : null}
      <Avatar sx={{ m: 1, bgcolor: 'primary.main' }}>
        <LockPersonIcon />
      </Avatar>
      <Typography component='h1' variant='h5'>
        Sign in
      </Typography>
      <Box component='form' onSubmit={handleSubmit} noValidate sx={{ mt: 1 }}>
        <TextField
          margin='normal'
          required
          fullWidth
          id='username'
          label='Username'
          name='username'
          autoComplete='username'
          autoFocus
        />
        <TextField
          margin='normal'
          required
          fullWidth
          name='password'
          label='Password'
          type='password'
          id='password'
          autoComplete='current-password'
        />
        <FormControlLabel
          control={<Checkbox value='remember' color='primary' />}
          label='Remember me'
        />
        <Button
          type='submit'
          fullWidth
          variant='contained'
          sx={{ mt: 3, mb: 2 }}
        >
          Sign In
        </Button>
        <Grid container>
          <Grid item xs>
            <Link href='#' variant='body2'>
              Forgot password?
            </Link>
          </Grid>
          <Grid item>
            <Link href='#' variant='body2' onClick={handleSignUp}>
              {"Don't have an account? Sign Up"}
            </Link>
          </Grid>
        </Grid>
      </Box>
    </React.Fragment>
  );
}

interface RegisterComponentProps {
  socket: LoRDraftClientSocket;
  toSignInFn: () => void;
}

function RegisterComponent({ socket, toSignInFn }: RegisterComponentProps) {
  const dispatch = useLoRDispatch();
  const [errorMessage, setErrorMessage] = React.useState<string | null>(null);

  const registerFn = async (registerInfo: RegisterInfo) => {
    const res = await registerUser(dispatch, { socket, registerInfo });

    if (!isOk(res)) {
      console.log(res);
      setErrorMessage(res.message);
    }
  };

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setErrorMessage(null);

    const data = new FormData(event.currentTarget);
    const username = data.get('username')?.toString();
    const email = data.get('email')?.toString();
    const password = data.get('password')?.toString();
    const password2 = data.get('password2')?.toString();

    if (username === undefined) {
      setErrorMessage('please specify a username');
    } else if (email === undefined) {
      setErrorMessage('please specify an email');
    } else if (password === undefined) {
      setErrorMessage('please specify a password');
    } else if (password2 === undefined) {
      setErrorMessage('please re-type your password');
    } else if (password !== password2) {
      setErrorMessage('passwords must match');
      data.set('password', '');
      data.set('password2', '');
    } else {
      registerFn({ username, password, email });
    }
  };

  const handleSignIn = (event: React.MouseEvent) => {
    event.preventDefault();
    toSignInFn();
  };

  return (
    <React.Fragment>
      {errorMessage !== null ? (
        <Box sx={{ color: 'error.main', fontStyle: 'italic' }}>
          {errorMessage.toLowerCase()}
        </Box>
      ) : null}
      <Avatar sx={{ m: 1, bgcolor: 'primary.main' }}>
        <LockOpenIcon />
      </Avatar>
      <Typography component='h1' variant='h5'>
        Register
      </Typography>
      <Box component='form' onSubmit={handleSubmit} noValidate sx={{ mt: 1 }}>
        <TextField
          margin='normal'
          required
          fullWidth
          id='username'
          label='Username'
          name='username'
          autoComplete='username'
          autoFocus
        />
        <TextField
          margin='normal'
          required
          fullWidth
          id='email'
          label='Email'
          name='email'
          autoComplete='email'
          autoFocus
        />
        <TextField
          margin='normal'
          required
          fullWidth
          name='password'
          label='Password'
          type='password'
          id='password'
          autoComplete='new-password'
        />
        <TextField
          margin='normal'
          required
          fullWidth
          name='password2'
          label='Retype Password'
          type='password'
          id='password2'
          autoComplete='new-password'
        />
        <FormControlLabel
          control={<Checkbox value='remember' color='primary' />}
          label='Remember me'
        />
        <Button
          type='submit'
          fullWidth
          variant='contained'
          sx={{ mt: 3, mb: 2 }}
        >
          Register
        </Button>
        <Grid container>
          <Grid item xs>
            {/*<Link href='#' variant='body2'>
              Forgot password?
            </Link>*/}
          </Grid>
          <Grid item>
            <Link href='#' variant='body2' onClick={handleSignIn}>
              Back to sign in
            </Link>
          </Grid>
        </Grid>
      </Box>
    </React.Fragment>
  );
}

interface SessionComponentProps {
  socket: LoRDraftClientSocket;
}

export const enum SignInState {
  LOGIN = 'LOGIN',
  REGISTER = 'REGISTER',
}

export default function SignIn({ socket }: SessionComponentProps) {
  const [signInState, setSignInState] = React.useState<SignInState>(
    SignInState.LOGIN
  );
  const toRegisterFn = () => {
    setSignInState(SignInState.REGISTER);
  };
  const toSignInFn = () => {
    setSignInState(SignInState.LOGIN);
  };

  let form;
  switch (signInState) {
    case SignInState.LOGIN: {
      form = <LoginComponent socket={socket} toRegisterFn={toRegisterFn} />;
      break;
    }
    case SignInState.REGISTER: {
      form = <RegisterComponent socket={socket} toSignInFn={toSignInFn} />;
      break;
    }
  }

  return (
    <Container component='main' maxWidth='xs'>
      <CssBaseline />
      <Box
        sx={{
          marginTop: 8,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
        }}
      >
        {form}
      </Box>
      <Copyright sx={{ mt: 8, mb: 4 }} />
    </Container>
  );
}
