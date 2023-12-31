import { Style } from '@mui/icons-material';
import ErrorIcon from '@mui/icons-material/Error';
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
import { ThemeProvider, createTheme } from '@mui/material/styles';
import * as React from 'react';

import { LoRDraftClientSocket, LoginCred } from 'common/game/socket-msgs';
import { isOk } from 'common/util/status';

import { LoRDispatch } from 'client/store';
import { useLoRDispatch } from 'client/store/hooks';
import { loginUser } from 'client/store/session';

function Copyright(props: TypographyProps) {
  return (
    <Typography
      variant='body2'
      color='text.secondary'
      align='center'
      {...props}
    >
      {'Copyright © '}
      <Link color='inherit' href='https://mui.com/'>
        LoRDraftKingdom
      </Link>{' '}
      {new Date().getFullYear()}
      {'.'}
    </Typography>
  );
}

interface LoginComponentProps {
  socket: LoRDraftClientSocket;
}

function LoginComponent({ socket }: LoginComponentProps) {
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
    const data = new FormData(event.currentTarget);

    const username = data.get('username')?.toString();
    const password = data.get('password')?.toString();

    console.log({ username, password });
    if (username && password) {
      loginFn({ username, password });
    }
  };

  return (
    <React.Fragment>
      {errorMessage ? (
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
            <Link href='#' variant='body2'>
              {"Don't have an account? Sign Up"}
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
        <LoginComponent socket={socket} />
      </Box>
      <Copyright sx={{ mt: 8, mb: 4 }} />
    </Container>
  );
}
