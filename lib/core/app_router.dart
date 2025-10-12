import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import '../features/home/home_screen.dart';
import '../features/portfolio/portfolio_screen.dart';
import '../features/autopilot/autopilot_screen.dart';
import '../features/execute/execute_screen.dart';
import '../features/withdraw/withdraw_screen.dart';
import '../features/settings/settings_screen.dart';

GoRouter buildRouter() => GoRouter(
  routes: [
    ShellRoute(
      builder: (context, state, child) => Scaffold(
        appBar: AppBar(title: const Text('Wealth Builder')),
        body: child,
        bottomNavigationBar: const _Nav(),
      ),
      routes: [
        GoRoute(path: '/', builder: (_, __) => const HomeScreen()),
        GoRoute(path: '/portfolio', builder: (_, __) => const PortfolioScreen()),
        GoRoute(path: '/autopilot', builder: (_, __) => const AutopilotScreen()),
        GoRoute(path: '/execute', builder: (_, __) => const ExecuteScreen()),
        GoRoute(path: '/withdraw', builder: (_, __) => const WithdrawScreen()),
        GoRoute(path: '/settings', builder: (_, __) => const SettingsScreen()),
      ],
    ),
  ],
);
class _Nav extends StatelessWidget {
  const _Nav();
  @override
  Widget build(BuildContext context) {
    final tabs = [
      ('/', Icons.home, 'Home'),
      ('/portfolio', Icons.pie_chart, 'Portfolio'),
      ('/autopilot', Icons.schedule, 'Autopilot'),
      ('/execute', Icons.link, 'Execute'),
      ('/withdraw', Icons.payments, 'Withdraw'),
      ('/settings', Icons.settings, 'Settings'),
    ];
    final loc = GoRouter.of(context).location;
    var idx = tabs.indexWhere((t) => t.$1 == loc);
    if (idx < 0) idx = 0;
    return NavigationBar(
      selectedIndex: idx,
      onDestinationSelected: (i) => GoRouter.of(context).go(tabs[i].$1),
      destinations: [for (final t in tabs) NavigationDestination(icon: Icon(t.$2), label: t.$3)],
    );
  }
}