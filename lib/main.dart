
import 'package:flutter/material.dart';
import 'core/app_router.dart';

void main() {
  runApp(const App());
}

class App extends StatelessWidget {
  const App({super.key});
  @override
  Widget build(BuildContext context) {
    return MaterialApp.router(
      title: 'Wealth Builder (Web)',
      theme: ThemeData(
        colorScheme: ColorScheme.fromSeed(seedColor: const Color(0xFF0F6EFA)),
        useMaterial3: true,
      ),
      routerConfig: buildRouter(),
    );
  }
}
